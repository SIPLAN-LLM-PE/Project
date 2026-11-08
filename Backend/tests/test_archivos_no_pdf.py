"""Rechazo de archivos que no son PDF: la extension .pdf sola no basta.

Antes, un Word/imagen/texto renombrado a .pdf pasaba el filtro de nombre y fallaba mas adelante con un
error 500 tecnico en ingles ("EOF marker not found"); y un nombre de mas de ~200 caracteres rompia el
guardado en disco. Estas pruebas fijan el comportamiento nuevo sin tocar la red ni la base de datos.
"""
import io
import zipfile

import PyPDF2
import pytest
from fastapi import UploadFile


def _pdf_minimo() -> bytes:
    escritor = PyPDF2.PdfWriter()
    escritor.add_blank_page(width=200, height=200)
    salida = io.BytesIO()
    escritor.write(salida)
    return salida.getvalue()


def _zip() -> bytes:
    salida = io.BytesIO()
    with zipfile.ZipFile(salida, "w") as z:
        z.writestr("word/document.xml", "<w:document/>")
    return salida.getvalue()


PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 200
JPG = b"\xff\xd8\xff\xe0" + b"\x00" * 200
FALSOS = {
    "word_o_zip": _zip(),
    "png": PNG,
    "jpg": JPG,
    "texto": b"DEMANDA DE ALIMENTOS\n" * 60,
    "html": b"<html><body><h1>DEMANDA</h1></body></html>",
    "vacio": b"",
}


def _subida(nombre: str, contenido: bytes) -> UploadFile:
    return UploadFile(file=io.BytesIO(contenido), filename=nombre)


# ---------- contenido_parece_pdf ----------

def test_un_pdf_real_se_reconoce(main):
    assert main.contenido_parece_pdf(_pdf_minimo())


def test_pdf_con_basura_antes_de_la_cabecera_se_acepta(main):
    assert main.contenido_parece_pdf(b"BASURA\n" * 20 + _pdf_minimo())


def test_cabecera_pasado_el_primer_kilobyte_no_cuenta(main):
    assert not main.contenido_parece_pdf(b"x" * 2000 + _pdf_minimo())


@pytest.mark.parametrize("clave", sorted(FALSOS))
def test_archivos_que_no_son_pdf_se_rechazan(main, clave):
    assert not main.contenido_parece_pdf(FALSOS[clave])


def test_contenido_nulo_no_revienta(main):
    assert not main.contenido_parece_pdf(None)


# ---------- validar_cabecera_pdf ----------

@pytest.mark.parametrize("clave", sorted(FALSOS))
def test_validar_cabecera_rechaza_el_falso_renombrado_a_pdf(main, clave):
    with pytest.raises(main.HTTPException) as error:
        main.validar_cabecera_pdf(_subida(f"{clave}.pdf", FALSOS[clave]))
    assert error.value.status_code == 400
    assert f"{clave}.pdf" in error.value.detail
    assert "no es un PDF" in error.value.detail


def test_validar_cabecera_acepta_un_pdf_y_deja_el_archivo_completo(main):
    """Si el puntero no volviera a 0, el analisis leeria el archivo sin su inicio."""
    contenido = _pdf_minimo()
    subida = _subida("demanda.pdf", contenido)
    main.validar_cabecera_pdf(subida)
    assert subida.file.tell() == 0
    assert subida.file.read() == contenido


# ---------- nombre_archivo_seguro_pdf ----------

def test_nombre_corto_solo_se_limpia(main):
    assert main.nombre_archivo_seguro_pdf("Demanda Alimentos (1).pdf", "a" * 64) == "Demanda_Alimentos__1_.pdf"


def test_nombre_con_ruta_no_puede_salir_de_la_carpeta(main):
    nombre = main.nombre_archivo_seguro_pdf("../../evil.pdf", "a" * 64)
    assert "/" not in nombre and "\\" not in nombre
    assert nombre.endswith("evil.pdf")


def test_nombre_largo_se_recorta_y_conserva_la_extension(main):
    nombre = main.nombre_archivo_seguro_pdf("x" * 300 + ".pdf", "abcdef0123456789" * 4)
    assert len(nombre) <= main.NOMBRE_ARCHIVO_MAX_CARACTERES
    assert nombre.endswith("_abcdef01.pdf")


def test_dos_nombres_largos_con_el_mismo_inicio_no_chocan(main):
    a = main.nombre_archivo_seguro_pdf("x" * 300 + "A.pdf", "1" * 64)
    b = main.nombre_archivo_seguro_pdf("x" * 300 + "B.pdf", "2" * 64)
    assert a != b


def test_nombre_vacio_no_revienta(main):
    assert main.nombre_archivo_seguro_pdf("", "a" * 64)
    assert main.nombre_archivo_seguro_pdf(None, "a" * 64)


# ---------- mensaje_error_lectura_pdf ----------

def _error_de_pypdf2(contenido: bytes) -> Exception:
    with pytest.raises(PyPDF2.errors.PdfReadError) as error:
        lector = PyPDF2.PdfReader(io.BytesIO(contenido))
        len(lector.pages)
    return error.value


def test_mensaje_para_pdf_con_contrasena(main):
    escritor = PyPDF2.PdfWriter()
    escritor.add_blank_page(width=200, height=200)
    escritor.encrypt("clave123")
    salida = io.BytesIO()
    escritor.write(salida)
    mensaje = main.mensaje_error_lectura_pdf("protegido.pdf", _error_de_pypdf2(salida.getvalue()))
    assert "contraseña" in mensaje and "protegido.pdf" in mensaje


def test_mensaje_para_pdf_vacio(main):
    mensaje = main.mensaje_error_lectura_pdf("vacio.pdf", _error_de_pypdf2(b""))
    assert "vacío" in mensaje


def test_mensaje_para_pdf_danado_no_muestra_texto_tecnico(main):
    truncado = _pdf_minimo()[:60]
    mensaje = main.mensaje_error_lectura_pdf("cortado.pdf", _error_de_pypdf2(b"%PDF-1.4\n" + truncado))
    assert "dañado o incompleto" in mensaje
    assert "EOF" not in mensaje and "startxref" not in mensaje


def test_el_evento_de_seguridad_se_clasifica_como_archivo_no_pdf(main):
    accion = "ADVERTENCIA | ARCHIVO_NO_PDF: carga rechazada (demanda.pdf)"
    assert main.tipo_evento_seguridad(accion) == "ARCHIVO_NO_PDF"
