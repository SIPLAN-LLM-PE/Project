"""Ingreso del obligado y pensión ordenada: se leen del propio texto, por concepto, y la duda se muestra como 'revisar'.

Los textos son sintéticos y cortos: cada prueba fija una regla general, no la redacción de un expediente concreto."""


def _expediente(*docs):
    return "".join(f"\n\n--- [DOCUMENTO {i}: {nombre}] ---\n\n{texto}" for i, (nombre, texto) in enumerate(docs, 1)).strip()


def _demanda(cuerpo):
    return ("01_DEMANDA_ALIMENTOS.pdf", f"DEMANDA DE ALIMENTOS\nLima, 10 de marzo de 2026.\n{cuerpo}")


def _sentencia(nombre, titulo, cuerpo):
    return (nombre, f"{titulo}\nLima, 12 de mayo de 2026.\n{cuerpo}")


# --- ingreso ---

def test_un_ingreso_que_el_texto_consigna_como_tal_se_acepta(main, sin_llm):
    """Regresión: 'se consigna como ingreso...' se descartaba por parecerse a una consignación de pago."""
    texto = _expediente(_demanda(
        "Para fines de alimentos se consigna como ingreso mensual referencial del demandado la suma de S/ 5,600.00 mensuales. "
        "Se solicita una pensión de S/ 1,100.00 mensuales."))
    ingreso = main._ingreso_obligado_verificado(texto)
    assert ingreso["monto"] == 5600.0
    assert ingreso["verificacion"] == {"estado": "verificada", "motivos": []}


def test_un_pago_o_un_gasto_no_es_un_ingreso(main, sin_llm):
    texto = _expediente(_demanda(
        "El demandado venía abonando S/ 200.00 mensuales y depositó S/ 350.00 en enero. Sus gastos suman S/ 900.00. "
        "El demandado percibe un ingreso aproximado de S/ 3,000.00 mensuales."))
    assert [c["valor"] for c in main._candidatos_ingreso(texto)] == [3000.0]


def test_una_pension_devengada_o_una_indemnizacion_no_son_ingresos(main, sin_llm):
    texto = _expediente(_demanda(
        "El saldo por pensiones devengadas asciende a S/ 12,840.00. La indemnización solicitada es de S/ 5,000.00."))
    assert main._ingreso_obligado_verificado(texto) is None


def test_si_el_texto_lista_varios_anos_vale_el_mas_reciente(main, sin_llm):
    texto = _expediente(_demanda(
        "El demandado refiere ingresos promedios de S/ 930.00 en 2019, S/ 1,630.08 en 2020 y S/ 2,013.33 en 2021."))
    assert main._ingreso_obligado_verificado(texto)["monto"] == 2013.33


def test_el_ingreso_del_demandado_manda_sobre_el_del_demandante(main, sin_llm):
    texto = _expediente(_demanda(
        "La demandante percibe ingresos aproximados de S/ 1,250.00 mensuales. El demandado percibe un ingreso de S/ 4,800.00."))
    assert main._ingreso_obligado_verificado(texto)["monto"] == 4800.0


def test_si_solo_figura_el_ingreso_de_la_otra_parte_se_muestra_pero_se_revisa(main, sin_llm):
    """Paga el demandante (p. ej. pidió el divorcio): su ingreso se muestra, pero nadie puede confirmar por el texto quién paga."""
    texto = _expediente(_demanda("El demandante percibe ingresos aproximados de S/ 7,200.00 mensuales."))
    ingreso = main._ingreso_obligado_verificado(texto)
    assert ingreso["monto"] == 7200.0
    assert ingreso["verificacion"]["estado"] == "revisar"
    assert "demandante" in ingreso["verificacion"]["motivos"][0]


def test_si_el_texto_dice_que_paga_el_demandante_se_toma_su_ingreso(main, sin_llm):
    texto = _expediente(
        _demanda("El demandante percibe ingresos de S/ 8,000.00 mensuales. La demandada percibe ingresos de S/ 1,500.00."),
        _sentencia("05_SENTENCIA_PRIMERA_INSTANCIA.pdf", "SENTENCIA DE PRIMERA INSTANCIA",
                   "SE RESUELVE: fijar alimentos equivalentes al 7% de los ingresos totales del demandante."))
    assert main._rol_obligado(texto) == "demandante"
    assert main._ingreso_obligado_verificado(texto)["monto"] == 8000.0


def test_entre_neto_y_bruto_manda_el_neto_aunque_el_bruto_se_repita(main, sin_llm):
    """Regla HU14 (ingreso neto acreditado > sueldo base): no gana quien más veces se menciona."""
    texto = _expediente(
        ("03_CONTESTACION_DEMANDA.pdf", "CONTESTACION DE DEMANDA\nLima, 20 de marzo de 2026.\n"
         "Señalo percibir un ingreso neto promedio de S/ 1,650.00 mensuales. Mi remuneración bruta referencial es de S/ 2,480.00. "
         "La constancia consigna una remuneración bruta de S/ 2,480.00. La boleta registra una remuneración bruta de S/ 2,480.00."))
    assert main._ingreso_obligado_verificado(texto)["monto"] == 1650.0


# --- pensión ordenada ---

def test_la_sentencia_de_vista_que_modifica_la_pension_manda_sobre_la_de_primera(main):
    texto = _expediente(
        _sentencia("05_SENTENCIA_PRIMERA_INSTANCIA.pdf", "SENTENCIA DE PRIMERA INSTANCIA",
                   "FALLO: declarar fundada en parte la demanda y ORDENO que el demandado acuda con una pensión alimenticia de S/ 300.00 mensuales."),
        _sentencia("07_SENTENCIA_DE_VISTA.pdf", "SENTENCIA DE VISTA",
                   "SE RESUELVE: REVOCAR el extremo alimentario y FIJAR a favor de la demandante una pensión alimenticia mensual de S/ 200.00 mensuales."))
    orden = main._pension_ordenada_del_expediente(texto)
    assert (orden["tipo"], orden["valor"], orden["documento"]) == ("monto_fijo", 200.0, "07_SENTENCIA_DE_VISTA.pdf")


def test_la_sentencia_de_vista_que_solo_confirma_deja_la_pension_de_primera(main):
    texto = _expediente(
        _sentencia("05_SENTENCIA_PRIMERA_INSTANCIA.pdf", "SENTENCIA DE PRIMERA INSTANCIA",
                   "FALLO: se fija pensión alimenticia de S/ 1,100.00 mensuales, a razón de S/ 550.00 para cada menor."),
        _sentencia("07_SENTENCIA_DE_VISTA.pdf", "SENTENCIA DE VISTA", "SE RESUELVE: CONFIRMAR la sentencia apelada."))
    assert main._pension_ordenada_del_expediente(texto)["valor"] == 1100.0


def test_pensiones_devengadas_o_liquidadas_no_son_la_pension_ordenada(main):
    """Regresión: 'pensiones alimenticias devengadas en la suma de S/ 12,840.00' salía como pensión fijada."""
    texto = _expediente(_sentencia(
        "09_AUTO_ESTADO_EJECUCION.pdf", "SENTENCIA",
        "FALLO: se aprueba la liquidación de pensiones alimenticias devengadas en la suma de S/ 12,840.00."))
    assert main._pension_ordenada_del_expediente(texto)["tipo"] == "no_detectado"


def test_lo_pedido_en_la_demanda_no_se_toma_como_pension_ordenada(main):
    texto = _expediente(_demanda("Solicito que se fije una pensión alimenticia de S/ 900.00 mensuales a cargo del demandado."))
    assert main._pension_ordenada_del_expediente(texto)["tipo"] == "no_detectado"


# --- verificación visible en el resultado ---

def test_una_pension_mayor_que_el_ingreso_queda_para_revision(main, sin_llm):
    texto = _expediente(
        _demanda("El demandado percibe un ingreso de S/ 2,000.00 mensuales."),
        _sentencia("05_SENTENCIA_PRIMERA_INSTANCIA.pdf", "SENTENCIA DE PRIMERA INSTANCIA",
                   "FALLO: ORDENO que el demandado acuda con una pensión alimenticia de S/ 2,500.00 mensuales."))
    verificacion = main.modulo_capacidad_cargas(texto)["verificacion"]
    assert verificacion["ingreso"]["estado"] == "verificada"
    assert verificacion["pension"]["estado"] == "revisar"
    assert "supera el ingreso" in verificacion["pension"]["motivos"][0]


# --- Otras cargas del obligado: solo las que el texto declara como tales ---

def test_una_fila_vacia_no_es_una_carga(main):
    assert main._carga_respaldada_en_texto({"tipo": "", "detalle": "", "monto_carga": 0.0, "evidencia": ""}) is False


def test_el_alimentista_del_proceso_no_es_una_carga_adicional(main):
    """Sin una frase que lo declare como OTRA obligación, un hijo nombrado en la demanda es el alimentista, no una carga."""
    assert main._carga_respaldada_en_texto({"tipo": "Menor", "detalle": "Bruno Yañez Gutierrez", "monto_carga": 0.0, "evidencia": ""}) is False


def test_la_pension_que_fijo_la_sentencia_no_es_una_carga(main):
    """Regresión: 'se fija una pensión mensual de S/ 2,800' salía como 'Carga familiar declarada' y se restaba del ingreso."""
    carga = {"tipo": "Carga familiar declarada", "detalle": "Otros dependientes del demandado", "monto_carga": 2800.0,
             "evidencia": "En atención a las necesidades de las menores, se fija una pensión mensual de S/ 2,800.00"}
    assert main._carga_respaldada_en_texto(carga, {"tipo": "monto_fijo", "valor": 2800.0}, 0.0) is False


def test_una_carga_que_el_texto_declara_como_otra_obligacion_se_conserva(main):
    carga = {"tipo": "Otro hijo", "detalle": "Mateo (5 años)", "monto_carga": 300.0,
             "evidencia": "Declaro que mantengo a otro hijo, Mateo, de cinco años, a quien aporto S/ 300.00 mensuales"}
    assert main._carga_respaldada_en_texto(carga, {"tipo": "monto_fijo", "valor": 900.0}, 900.0) is True


def test_una_obligacion_previa_en_porcentaje_se_conserva(main):
    carga = {"tipo": "Obligación alimentaria previa", "detalle": "Hijos de otra relación", "monto_carga": 826.0, "porcentaje_haber": 25.0, "evidencia": "25 % de sus haberes"}
    assert main._carga_respaldada_en_texto(carga) is True
