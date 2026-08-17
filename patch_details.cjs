const fs = require('fs');
let code = fs.readFileSync('src/components/players/PlayerModals.tsx', 'utf8');

code = code.replace(
`export function DetailsModal({ player, isOpen, onClose, stats }: DetailsModalProps) {
  const [brawlers, setBrawlers] = useState<Brawler[]>([]);`,
`export function DetailsModal({ player, isOpen, onClose, stats }: DetailsModalProps) {
  const [brawlers, setBrawlers] = useState<Brawler[]>([]);
  const [showWinrateDetails, setShowWinrateDetails] = useState(false);`
);

fs.writeFileSync('src/components/players/PlayerModals.tsx', code);
