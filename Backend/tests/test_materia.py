"""Materia y pretensiones del proceso: salen del título/petitorio de la demanda, no se suponen."""


def _demanda(cuerpo):
    return f"--- [DOCUMENTO 1: 01_DEMANDA.pdf] ---\n\n{cuerpo}"


def test_la_materia_sale_del_titulo_de_la_demanda(main):
    texto = _demanda("CORTE SUPERIOR DE JUSTICIA DE CUSCO\nDEMANDA DE DIVORCIO POR SEPARACIÓN DE HECHO Y ALIMENTOS\n"
                     "SEÑOR JUEZ DEL JUZGADO DE FAMILIA:\nAna Soto interpone demanda.")
    assert main._materia_del_proceso(texto) == "Divorcio por separación de hecho y alimentos"


def test_el_titulo_que_sigue_en_el_renglon_siguiente_se_une(main):
    texto = _demanda("DEMANDA DE DIVORCIO POR CAUSAL DE SEPARACIÓN DE HECHO Y\nPRETENSIONES ACUMULADAS\nSEÑOR JUEZ DEL JUZGADO DE FAMILIA:\n")
    assert main._materia_del_proceso(texto) == "Divorcio por causal de separación de hecho y pretensiones acumuladas"


def test_la_materia_tambien_puede_ir_en_un_rotulo_de_dos_renglones(main):
    texto = _demanda("EXPEDIENTE N.° 0017-2025\nMATERIA: RECONOCIMIENTO DE TENENCIA, CUSTODIA, REGIMEN DE VISITAS Y\nALIMENTOS\n"
                     "ESCRITO DE DEMANDA\nSEÑOR JUEZ:")
    assert main._materia_del_proceso(texto) == "Reconocimiento de tenencia, custodia, regimen de visitas y alimentos"


def test_sin_titulo_la_materia_se_toma_de_la_frase_con_que_se_interpone(main):
    texto = _demanda("ESCRITO DE DEMANDA\nAL JUZGADO DE PAZ LETRADO:\nLourdes Mariaca, identificada con DNI N. 44829613, interpone demanda de "
                     "reconocimiento\nde tenencia y alimentos contra Edgar Aima, identificado con DNI N. 42671895.")
    assert main._materia_del_proceso(texto) == "Reconocimiento de tenencia y alimentos"


def test_si_el_expediente_no_dice_la_materia_no_se_inventa(main):
    assert main._materia_del_proceso(_demanda("Lima, 10 de marzo de 2026.\nSe presenta un escrito sin título.")) is None


def test_las_pretensiones_son_las_que_nombra_el_petitorio_no_los_hechos(main):
    texto = _demanda(
        "DEMANDA DE DIVORCIO POR CAUSAL DE SEPARACIÓN DE HECHO\nSEÑOR JUEZ:\nI. PETITORIO\n"
        "Solicito que se declare disuelto el vínculo matrimonial y, como pretensión accesoria, la liquidación de la sociedad de gananciales.\n"
        "II. FUNDAMENTOS DE HECHO\nEl demandado nunca cumplió con los alimentos de sus hijos ni con las visitas.")
    assert main._pretensiones_del_proceso(texto, main._materia_del_proceso(texto)) == ["Divorcio", "Liquidación de sociedad de gananciales"]
