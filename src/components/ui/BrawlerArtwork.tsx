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
 * A BrawlAPI pode publicar dados antes dos retratos chegarem à Brawlify.
 * A BSInfo CDN e seu repositório público mantêm imagens por ID do jogo.
 * Usamos esses endereços APENAS quando os links cadastrados falham;
 * nenhum valor de tier ou dado de equipe é modificado.
 */
export function getBrawlerArtworkSources(
  iconUrl?: string | null,
  imageUrl?: string | null,
  preferPortrait = false
): string[] {
  const ordered = preferPortrait ? [imageUrl, iconUrl] : [iconUrl, imageUrl];
  const candidates = ordered.filter(
    (url): url is string => typeof url === 'string' && /^https:\/\//.test(url)
  );
  const gameId = candidates.map(url => url.match(/(160\d{5})\.(?:png|webp)(?:[?#]|$)/)?.[1]).find(Boolean);
  if (gameId) {
    const folder = preferPortrait ? 'portrait' : 'border';
    const alternate = preferPortrait ? 'border' : 'portrait';
    candidates.push(
      `https://cdn.bsinfox.com/brawlers/${folder}/${gameId}.png`,
      `https://cdn.bsinfox.com/brawlers/${alternate}/${gameId}.png`,
      `https://raw.githubusercontent.com/lot-xq/BSInfo-CDN/main/brawlers/${folder}/${gameId}.png`,
      `https://raw.githubusercontent.com/lot-xq/BSInfo-CDN/main/brawlers/${alternate}/${gameId}.png`,
    );
  }
  return [...new Set(candidates)];
}
export function BrawlerArtwork({
  name, iconUrl, imageUrl, preferPortrait = false,
  large = false, className, imageClassName
}: BrawlerArtworkProps) {
  const sources = useMemo(
    () => getBrawlerArtworkSources(iconUrl, imageUrl, preferPortrait),
    [iconUrl, imageUrl, preferPortrait]
  );
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
