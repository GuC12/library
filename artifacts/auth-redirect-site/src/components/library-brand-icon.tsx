const iconUrl = `${import.meta.env.BASE_URL}favicon-book.png`;

export function LibraryBrandIcon({ className = 'h-10 w-10' }: { className?: string }) {
  return <img src={iconUrl} alt="" aria-hidden="true" width={36} height={44} draggable={false} className={`block shrink-0 object-contain ${className}`} />;
}