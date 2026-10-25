"""Postura de la contestación y puntos controvertidos: salen del texto del expediente, no se inventan."""


def test_puntos_controvertidos_del_acta(main, exp):
    _, esperado, texto = exp
    puntos = main._extraer_puntos_controvertidos_acta(texto)
    assert len(puntos) == esperado["puntos_acta"]
    assert all("\n" not in p["sugerencia"] and p["sugerencia"] for p in puntos)


def test_hechos_de_contestacion_y_audiencia(main, exp):
    _, esperado, texto = exp
    esperado = esperado["postura"]
    hechos = main._hechos_contestacion_y_audiencia(texto)
    assert hechos["oferta"] == esperado["oferta"]
    assert hechos["audiencia"]["demandante_reduce"] == esperado["demandante_reduce"]
    assert hechos["audiencia"]["demandado_eleva"] == esperado["demandado_eleva"]
    assert hechos["audiencia"]["sin_acuerdo"] is True


def test_la_postura_integra_los_hechos_sin_duplicar(main, exp):
    _, esperado, texto = exp
    base = {
        "tecnico": "El demandado compareció y dejó constancia de su oferta durante la audiencia. La sentencia ordenó el pago.",
        "estandar": "El demandado asistió a la audiencia y ofreció pagar una pensión alimenticia. Se ordenó el pago.",
    }
    una_vez = main._integrar_oferta_contestacion(dict(base), texto)
    dos_veces = main._integrar_oferta_contestacion(dict(una_vez), texto)
    assert una_vez == dos_veces, "aplicarla otra vez (como al leer el expediente) no debe cambiar el texto"
    assert "dejó constancia de su oferta" not in una_vez["tecnico"]
    oferta = f"S/ {esperado['postura']['oferta']:.2f}"
    assert una_vez["tecnico"].count(oferta) == 1
    assert "La sentencia ordenó el pago." in una_vez["tecnico"]


def test_la_postura_dice_lo_que_ordeno_la_sentencia_solo_si_la_ia_no_lo_dijo(main, exp):
    """Sin IA (servidor sin Ollama) la postura igual debe incluir el fallo; con IA no se duplica."""
    _, esperado, texto = exp
    pension = esperado["pension"][1]
    sin_ia = main._integrar_oferta_contestacion({"tecnico": "No se generó postura por indisponibilidad del motor.", "estandar": "x"}, texto)
    assert f"S/ {pension:.2f} mensuales" in sin_ia["tecnico"]
    con_ia = main._integrar_oferta_contestacion({"tecnico": f"La sentencia fijó S/. {pension:.2f} mensuales.", "estandar": "x"}, texto)
    assert con_ia["tecnico"].count(f"{pension:.2f}") == 1


def test_se_rechaza_la_sugerencia_inventada_por_la_ia(main, texto_exp):
    """Caso real: la IA atribuyó al acta una frase de la sentencia y 'corrigió' 1490 con 1490."""
    texto = texto_exp("EXP_0002")
    inventada = {
        "tema": "Error en la redacción del acta de audiencia",
        "sugerencia": (
            "En el párrafo segundo del punto III, se menciona que 'la relación de necesidades presentada estima un "
            "total mensual cercano a S/. 1490.00'. Sin embargo, en el documento 2, la estimación total es de "
            "S/. 1490.00 y no cercana."
        ),
    }
    cita_real = {"tema": "Acta", "sugerencia": "El acta dice 'Se tienen como cuestiones a resolver' sin enumerar plazos."}
    cita_falsa = {"tema": "Demanda", "sugerencia": "La demanda dice 'el menor vive con su abuela materna en Lima'."}
    assert main._punto_sugerido_fundamentado(inventada, texto) is False
    assert main._punto_sugerido_fundamentado(cita_real, texto) is True
    assert main._punto_sugerido_fundamentado(cita_falsa, texto) is False


# --- Puntos controvertidos en distintos formatos de acta ---

def _acta(cuerpo):
    return f"--- [DOCUMENTO 1: 04_ACTA_DE_AUDIENCIA_UNICA.pdf] ---\n\nACTA DE AUDIENCIA ÚNICA\nLima, 10 de abril de 2026.\n{cuerpo}"


def _puntos(main, cuerpo):
    return [p["sugerencia"] for p in main._extraer_puntos_controvertidos_acta(_acta(cuerpo))]


def test_puntos_en_lista_numerada_bajo_el_encabezado(main):
    puntos = _puntos(main, "II. PUNTOS CONTROVERTIDOS\n1. Determinar si corresponde reconocer la tenencia.\n"
                           "2. Determinar el monto de la pensión alimenticia.\n3. Determinar el régimen de visitas.\nIII. ACTUACIÓN PROBATORIA\nSe admiten los medios.")
    assert puntos == ["Determinar si corresponde reconocer la tenencia", "Determinar el monto de la pensión alimenticia",
                      "Determinar el régimen de visitas"]


def test_puntos_con_viñetas(main):
    puntos = _puntos(main, "PUNTOS CONTROVERTIDOS\n- Determinar si corresponde declarar el divorcio.\n- Determinar si procede la indemnización.\nMEDIOS PROBATORIOS\n")
    assert len(puntos) == 2 and puntos[1].startswith("Determinar si procede")


def test_puntos_como_frases_que_empiezan_con_un_verbo(main):
    puntos = _puntos(main, "PUNTOS CONTROVERTIDOS\nDeterminar la tenencia más favorable para el menor. Establecer el régimen de visitas. "
                           "Definir si corresponde pensión alimenticia.\nIII. ACTUACIÓN\n")
    assert len(puntos) == 3


def test_puntos_encadenados_en_una_oracion_sin_dos_puntos(main):
    puntos = _puntos(main, "Se fijan como puntos controvertidos determinar si corresponde el divorcio; establecer si procede regular alimentos y determinar si existe cónyuge perjudicado.")
    assert len(puntos) == 3 and not puntos[0].lower().startswith("se fijan")


def test_un_titulo_que_nombra_los_puntos_no_es_una_lista(main):
    assert _puntos(main, "PUNTOS CONTROVERTIDOS Y ACTUACIÓN PROBATORIA\nExpediente 0038-2025 Materia Divorcio Demandante Jessica Trujillo Fecha de audiencia 12 de abril.") == []


def test_cada_punto_es_texto_literal_del_acta(main):
    cuerpo = "Se declara saneado el proceso y se fijan como puntos controvertidos: 1) Determinar la tenencia; 2) Determinar los alimentos."
    acta = _acta(cuerpo)
    for p in main._extraer_puntos_controvertidos_acta(acta):
        assert p["sugerencia"] in acta


# --- La narrativa de la IA no puede afirmar montos, fechas ni porcentajes que el expediente no contiene ---

FUENTE_NARRATIVA = ("--- [DOCUMENTO 1: 05_SENTENCIA.pdf] ---\n\nSENTENCIA\nLima, 20 de mayo de 2021.\n"
                    "FALLO: ORDENO que el demandado acuda con una pensión de S/ 2,000.00 mensuales, equivalente al 15% de sus haberes.")


def test_se_quita_la_oracion_con_un_monto_que_el_expediente_no_contiene(main):
    """Regresión: la IA escribió 'dejó constancia de su oferta de S/ 1,500.00' sin que nadie lo ofreciera."""
    narrativa = ("El demandado dejó constancia de su oferta de S/ 1,500.00 mensuales. "
                 "La sentencia del 20 de mayo de 2021 ordenó una pensión de S/ 2,000.00 mensuales.")
    depurada = main._depurar_afirmaciones_sin_respaldo(narrativa, FUENTE_NARRATIVA)
    assert "1,500" not in depurada and "S/ 2,000.00" in depurada


def test_se_quita_la_oracion_con_una_fecha_o_un_porcentaje_inventado(main):
    narrativa = ("La audiencia se realizó el 3 de febrero de 2020. La pensión equivale al 40% de los ingresos. "
                 "La sentencia fijó el 15% de los haberes del demandado.")
    depurada = main._depurar_afirmaciones_sin_respaldo(narrativa, FUENTE_NARRATIVA)
    assert depurada == "La sentencia fijó el 15% de los haberes del demandado."


def test_una_oracion_sin_cifras_no_se_toca(main):
    narrativa = "El demandado reconoce su obligación alimentaria. Se fijaron puntos controvertidos en la audiencia."
    assert main._depurar_afirmaciones_sin_respaldo(narrativa, FUENTE_NARRATIVA) == narrativa
