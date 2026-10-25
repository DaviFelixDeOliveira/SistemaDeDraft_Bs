import { useEffect, useRef, useState } from 'react';
import { Camera, Crop, ImagePlus, MonitorUp, ShieldCheck, Square } from 'lucide-react';
import { describeDraftFrame, draftFrameCrop, validateDraftFrame, type FrameArea, type FrameMetadata } from '../../lib/draftAutoFrame';
import { DraftAutoVisionPreview } from './DraftAutoVisionPreview';
import { DraftAutoVisualMarkerLab } from './DraftAutoVisualMarkerLab';
import { DraftAutoSlotLocatorLab } from './DraftAutoSlotLocatorLab';
import type { GuestJoinSession } from '../../services/draftAutoGuestService';

const label = 'block text-xs font-semibold text-zinc-400 mb-1';
const MAX_SCREEN_PIXELS = 24_000_000;

/**
 * Local-first image input and desktop screen capture.
 *
 * Privacy:
 * - No screenshot is uploaded to Supabase.
 * - No original screenshot is saved to localStorage or sessionStorage.
 * - A browser screen share requires a user click and explicit browser consent.
 * - After one captured frame, all tracks are stopped.
 *
 * Recognizing map, bans, picks or players is NOT implemented here yet:
 * representative real Brawl Stars frames are required for calibration.
 */
export function DraftAutoCaptureLab({session,onSessionExpired}: {session:GuestJoinSession;onSessionExpired:()=>void}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [cropPreview, setCropPreview] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<FrameMetadata | null>(null);
  const [area, setArea] = useState<FrameArea>('completa');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [streaming, setStreaming] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewRef = useRef<string | null>(null);
  const cropRef = useRef<string | null>(null);

  function replaceUrl(kind: 'main' | 'crop', url: string | null) {
    const target = kind === 'main' ? previewRef : cropRef;
    if (target.current) URL.revokeObjectURL(target.current);
    target.current = url;
    if (kind === 'main') setPreview(url); else setCropPreview(url);
  }
  function stopSharing() {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStreaming(false);
  }
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop());
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      if (cropRef.current) URL.revokeObjectURL(cropRef.current);
    };
  }, []);

  async function showFrame(file: File) {
    setError('');
    const invalid = validateDraftFrame(file.type, file.size);
    if (invalid) { setError(invalid); return; }
    const candidateUrl = URL.createObjectURL(file);
    const image = new Image();
    try {
      const info = await new Promise<FrameMetadata>((resolve, reject) => {
        image.onload = () => {
          try { resolve(describeDraftFrame(image.naturalWidth, image.naturalHeight)); }
          catch (cause) { reject(cause); }
        };
        image.onerror = () => reject(new Error('Não foi possível abrir esta imagem.'));
        image.src = candidateUrl;
      });
      replaceUrl('main', candidateUrl);
      replaceUrl('crop', null);
      setArea('completa');
      setMetadata(info);
      setStatus('Imagem aberta localmente. Nenhuma foto foi enviada à internet.');
    } catch (cause) {
      URL.revokeObjectURL(candidateUrl);
      setError(cause instanceof Error ? cause.message : 'Imagem inválida.');
    }
  }

  async function beginScreenShare() {
    setError(''); setStatus('');
    stopSharing();
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError('Este navegador não permite compartilhar a tela. Use o envio de uma imagem, ou teste no Chrome/Edge do computador.');
      return;
    }
    try {
      // Call directly from the click handler: no silent permission or access to the game.
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      track?.addEventListener('ended', () => stopSharing(), { once: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreaming(true);
      setStatus('Compartilhamento ativo. Escolha a janela do jogo espelhado e clique em “Capturar um quadro”.');
    } catch {
      stopSharing();
      setError('Compartilhamento não iniciado. Você pode negar a permissão e continuar usando o sistema.');
    }
  }

  async function captureOneFrame() {
    const video = videoRef.current;
    if (!streamRef.current || !video?.videoWidth || !video.videoHeight) {
      setError('A imagem da janela ainda não está disponível. Confira a permissão e tente novamente.');
      return;
    }
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (width * height > MAX_SCREEN_PIXELS || width < 200 || height < 200) {
      setError('Resolução incompatível. Escolha outra janela ou reduza a resolução.');
      stopSharing(); return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) { setError('Não foi possível preparar a captura.'); stopSharing(); return; }
    ctx.drawImage(video, 0, 0, width, height);
    stopSharing(); // consent applies only to this explicitly requested frame
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) { setError('Não foi possível converter a captura.'); return; }
    await showFrame(new File([blob], 'captura-local.png', { type: 'image/png' }));
  }

  async function cropFrame() {
    if (!preview || !metadata) return;
    setError('');
    const image = new Image();
    try {
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('Não foi possível recortar a imagem.'));
        image.src = preview;
      });
      const selection = draftFrameCrop(metadata.width, metadata.height, area);
      const canvas = document.createElement('canvas');
      canvas.width = selection.width;
      canvas.height = selection.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('O navegador não conseguiu criar o recorte.');
      context.drawImage(image,
        selection.x, selection.y, selection.width, selection.height,
        0, 0, selection.width, selection.height);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Não foi possível finalizar o recorte.');
      replaceUrl('crop', URL.createObjectURL(blob));
      setStatus('Recorte disponível somente neste dispositivo. Ainda não há reconhecimento automático.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Erro ao recortar.');
    }
  }

  return (
    <section className="space-y-4 border-t border-zinc-800 pt-5 text-left">
      <h3 className="font-bold text-sm flex gap-2 items-center"><Camera className="w-4 h-4 text-indigo-400" /> Captura de imagem — teste local</h3>
      <p className="text-xs text-zinc-400">
        Prepare uma captura real do Brawl Stars para os próximos testes. A versão experimental já consegue sugerir <strong>quem começa</strong> em algumas telas de anúncio.
        <strong> Ainda não identifica mapa, picks ou bans, e não envia o arquivo da imagem ao coach.</strong>
      </p>
      <div className="p-3 rounded-lg border border-emerald-600/30 bg-emerald-500/5 text-xs text-zinc-300 flex gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0"/>
        A imagem e o recorte permanecem somente no seu navegador. Nenhuma captura é salva na conta ou enviada ao Supabase.
      </div>
      <label className={label}>Escolher print do celular ou computador (PNG, JPEG, WebP; até 10 MB)</label>
      <label className="flex items-center justify-center gap-2 cursor-pointer rounded-lg border border-dashed border-indigo-500/50 p-3 text-sm text-indigo-300 hover:bg-indigo-500/10">
        <ImagePlus className="w-4 h-4" />
        Selecionar captura salva
        <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp"
          onChange={event => {
            const file = event.currentTarget.files?.[0];
            if (file) void showFrame(file);
            event.currentTarget.value = '';
          }}/>
      </label>
      <div className="space-y-2">
        <p className="text-xs text-zinc-500">No computador, você também pode compartilhar uma janela espelhada do jogo e capturar apenas um quadro. O navegador pedirá sua permissão.</p>
        <video ref={videoRef} muted playsInline autoPlay
          className={streaming ? 'w-full rounded-lg border border-zinc-700 bg-black' : 'hidden'}/>
        {!streaming ? <button type="button" onClick={() => void beginScreenShare()}
          className="flex w-full justify-center items-center gap-2 text-sm rounded-lg border border-zinc-700 py-2">
          <MonitorUp className="w-4 h-4"/> Compartilhar janela (computador)
        </button> : <div className="flex gap-2">
          <button type="button" className="flex-1 rounded-lg bg-indigo-600 text-white p-2 text-sm" onClick={() => void captureOneFrame()}>
            Capturar um quadro
          </button>
          <button type="button" className="rounded-lg border border-zinc-700 px-3 py-2 text-sm flex items-center gap-1"
            onClick={stopSharing}><Square className="w-3 h-3"/> Parar</button>
        </div>}
      </div>
      {error && <p role="alert" className="rounded-lg p-3 text-xs bg-red-500/10 text-red-400">{error}</p>}
      {status && <p role="status" className="rounded-lg p-3 text-xs bg-emerald-500/10 text-emerald-400">{status}</p>}
      {preview && metadata && <div className="space-y-3">
        <div className="flex justify-between gap-2 text-xs text-zinc-400">
          <span>{metadata.width} × {metadata.height}</span>
          <span>{metadata.orientation} · {metadata.megapixels} MP</span>
        </div>
        <img src={preview} alt="Prévia local da imagem escolhida" className="rounded-lg w-full max-h-80 object-contain border border-zinc-800 bg-black"/>
        <DraftAutoVisionPreview imageUrl={preview} session={session} onSessionExpired={onSessionExpired}/>
        <DraftAutoSlotLocatorLab imageUrl={preview}/>
        <label className={label}>Área para avaliar (recorte manual)</label>
        <select className="w-full bg-zinc-950 rounded-lg border border-zinc-700 p-2 text-sm"
          value={area} onChange={event => {setArea(event.target.value as FrameArea);replaceUrl('crop', null);}}>
          <option value="completa">Imagem completa</option>
          <option value="superior">Parte superior</option>
          <option value="central">Parte central</option>
          <option value="inferior">Parte inferior</option>
        </select>
        <button type="button" onClick={() => void cropFrame()} className="flex items-center justify-center w-full gap-2 rounded-lg bg-zinc-800 p-2 text-sm">
          <Crop className="w-4 h-4"/> Preparar recorte
        </button>
        {cropPreview && <img src={cropPreview} alt="Recorte local para testes futuros" className="rounded-lg w-full max-h-64 object-contain border border-zinc-700 bg-black"/>}
      </div>}
      <DraftAutoVisualMarkerLab />
    </section>
  );
}
