import { Leaf } from 'lucide-react';
import Link from 'next/link';

export default function AppHeader() {
  return (
    <header className="bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
          <Leaf className="h-8 w-8" />
          <span>MediBloom</span>
        </Link>
        {/* Future: Language switcher could go here */}
      </div>
    </header>
  );
}
