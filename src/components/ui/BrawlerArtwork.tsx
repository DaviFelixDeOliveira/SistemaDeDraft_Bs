import { useEffect, useMemo, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '../../lib/utils';

interface BrawlerArtworkProps {
  name: string;
  iconUrl?: string | null;
  imageUrl?: string | null;
  preferPortrait?: boolean;
  large?: boolean;
  className?: string;
  imageClassName?: string;
}

/**
 * O catálogo BrawlAPI pode listar um brawler antes de suas imagens serem
 * distribuídas pela CDN. Tenta os dois retratos, mas nunca exibe o "ícone
 * quebrado" do navegador. A próxima montagem do componente tenta novamente
 * (assim as imagens voltam a aparecer quando o CDN for atualizado).
 */
export function BrawlerArtwork({
  name, iconUrl, imageUrl, preferPortrait = false,
  large = false, className, imageClassName
}: BrawlerArtworkProps) {
  const sources = useMemo(() => [...new Set(
    (preferPortrait ? [imageUrl, iconUrl] : [iconUrl, imageUrl])
      .filter((url): url is string => typeof url === 'string' && /^https:\/\//.test(url))
  )], [iconUrl, imageUrl, preferPortrait]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => setAttempt(0), [iconUrl, imageUrl, preferPortrait]);

  const current = sources[attempt];
  const initial = name.trim().slice(0, 2).toUpperCase() || '?';

  return (
    <div role="img" aria-label={name} title={!current ? 'Imagem do brawler ainda indisponível na fonte' : name}
      className={cn('relative flex items-center justify-center overflow-hidden bg-slate-800/90 text-slate-100', className)}>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-indigo-600/60 via-slate-800 to-cyan-700/40">
        {large && <ImageOff className="h-5 w-5 text-white/60" aria-hidden="true" />}
        <span aria-hidden="true" className={cn('font-black tracking-tight text-white/95', large ? 'text-2xl' : 'text-[11px]')}>
          {initial}
        </span>
      </div>
      {current && (
        <img key={current} src={current} alt="" loading="lazy"
          className={cn('relative z-10 h-full w-full object-cover', imageClassName)}
          onError={() => setAttempt(previous => Math.min(previous + 1, sources.length))}
        />
      )}
    </div>
  );
}
