import React from 'react';
import { Proximamente } from '@/components/layout/Proximamente';

export default function ForoPage() {
  return (
    <Proximamente
      titulo="Foro académico"
      descripcion="Un espacio para compartir dudas, responder a tus compañeros y construir conocimiento juntos."
      emoji="💬"
      detalles={[
        'Preguntas organizadas por asignatura y tema',
        'Respuestas de compañeros y monitores',
        'Votos para destacar las dudas más útiles',
        'Notificaciones cuando respondan a tu pregunta',
      ]}
    />
  );
}
