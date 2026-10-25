import Image from 'next/image';

interface UTBLogoProps {
  /** Clases de tamaño (alto). El ancho se ajusta automáticamente. */
  className?: string;
  /** Carga prioritaria para el logo visible en la primera pintura. */
  priority?: boolean;
}

/**
 * Logo oficial de la Universidad Tecnológica de Bolívar.
 * La imagen (public/logo-utb.png) ya incluye el nombre de la universidad
 * y tiene fondo transparente, por lo que se integra con cualquier fondo claro.
 */
export const UTBLogo: React.FC<UTBLogoProps> = ({ className = 'h-24', priority = false }) => {
  return (
    <Image
      src="/logo-utb.png"
      alt="Universidad Tecnológica de Bolívar"
      width={415}
      height={191}
      priority={priority}
      className={`w-auto object-contain ${className}`}
    />
  );
};
