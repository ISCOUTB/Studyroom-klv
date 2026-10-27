import React from 'react';
import { Proximamente } from '@/components/layout/Proximamente';

export default function BancoEjerciciosPage() {
  return (
    <Proximamente
      titulo="Banco de ejercicios"
      descripcion="Practica con ejercicios por materia, recibe retroalimentación y prepárate para tus evaluaciones."
      emoji="🧮"
      detalles={[
        'Ejercicios clasificados por dificultad y tema',
        'Soluciones paso a paso y retroalimentación',
        'Prácticas personalizadas según tu avance',
        'Seguimiento de tu progreso por asignatura',
      ]}
    />
  );
}
