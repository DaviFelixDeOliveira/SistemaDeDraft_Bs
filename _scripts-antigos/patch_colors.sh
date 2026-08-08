for file in $(find src/components -type f -name "*.tsx"); do
  # Inject import if needed
  if grep -q "getBrawlerBgColor" "$file"; then
    echo "Already in $file"
  else
    if grep -q "<img" "$file"; then
      sed -i '1s/^/import { getBrawlerBgColor } from "..\/..\/lib\/utils";\n/' "$file"
    fi
  fi
done
