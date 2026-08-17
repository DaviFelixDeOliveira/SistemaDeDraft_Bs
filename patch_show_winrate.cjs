const fs = require('fs');
let code = fs.readFileSync('src/components/players/PlayerModals.tsx', 'utf8');

code = code.replace(
`export function PlayerStatsModal({ player, isOpen, onClose }: { player: Player | null, isOpen: boolean, onClose: () => void }) {
  const [stats, setStats] = useState<any>(null);`,
`export function PlayerStatsModal({ player, isOpen, onClose }: { player: Player | null, isOpen: boolean, onClose: () => void }) {
  const [stats, setStats] = useState<any>(null);
  const [showWinrateDetails, setShowWinrateDetails] = useState(false);`
);

fs.writeFileSync('src/components/players/PlayerModals.tsx', code);
