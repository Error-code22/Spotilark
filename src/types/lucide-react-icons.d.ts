declare module 'lucide-react/icons/*' {
  import { LucideProps } from 'lucide-react';
  import React from 'react';
  const Icon: React.ForwardRefExoticComponent<Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>>;
  export default Icon;
}
