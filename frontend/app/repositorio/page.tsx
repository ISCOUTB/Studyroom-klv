import React from 'react';
import { Proximamente } from '@/components/layout/Proximamente';

export default function RepositorioPage() {
  return (
    <Proximamente
      titulo="Repositorio de materiales"
      descripcion="Apuntes, guías y recursos compartidos por la comunidad UTB, organizados para estudiar mejor."
      emoji="📂"
      detalles={[
        'Materiales filtrados por asignatura y semestre',
        'Apuntes, guías y talleres de tus compañeros',
        'Valoraciones y comentarios sobre cada recurso',
        'Acceso rápido desde tus salas de estudio',
      ]}
    />
  );
}
