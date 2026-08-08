sed -i '/const \[formData, setFormData\] = useState/!b;n;n;n;n;n;n;n;n;n;n;n;n;n;a\
  useEffect(() => {\
    if (isOpen) {\
      setFormData(player || {\
        id: Math.random().toString(36).substr(2, 9),\
        name: "",\
        nickname: "",\
        role: "Lane",\
        status: "Titular",\
        isActive: true,\
        comfortBrawlers: [],\
        tags: []\
      });\
    }\
  }, [player, isOpen]);\
' src/components/players/PlayerModals.tsx
