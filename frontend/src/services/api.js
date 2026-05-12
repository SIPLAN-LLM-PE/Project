// Archivo: src/services/api.js
import axios from 'axios';

// Tu URL base de FastAPI (usualmente corre en el puerto 8000 en local)
const API_URL = 'http://localhost:8000/api/v1'; 

export const apiService = {
  // 1. Subir el expediente (PDF) para el análisis inicial
  uploadExpediente: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_URL}/analyze-document`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data; // Aquí FastAPI debería devolverte el JSON con el análisis de spaCy/Mistral
    } catch (error) {
      console.error("Error al subir el expediente:", error);
      throw error;
    }
  },

  // 2. Chat interactivo con el RAG
  askChatbot: async (expedienteId, question) => {
    try {
      const response = await axios.post(`${API_URL}/chat`, {
        expediente_id: expedienteId,
        query: question
      });
      return response.data;
    } catch (error) {
      console.error("Error en el chat:", error);
      throw error;
    }
  }
};