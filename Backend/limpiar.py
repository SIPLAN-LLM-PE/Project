import sqlite3

# Conectar a tu base de datos actual
conn = sqlite3.connect("sigeja_registros.db")

try:
    # Eliminamos cualquier registro donde el número de expediente esté vacío o sea nulo
    cursor = conn.execute("DELETE FROM registro_expedientes WHERE numero_expediente = '' OR numero_expediente IS NULL")
    conn.commit()
    
    filas_borradas = cursor.rowcount
    print(f"¡Limpieza exitosa! Se eliminaron {filas_borradas} expedientes fantasma.")
except Exception as e:
    print(f"Error al limpiar: {e}")
finally:
    conn.close()