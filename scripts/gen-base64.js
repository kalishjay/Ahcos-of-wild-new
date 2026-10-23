const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, '..', 'assets', 'models');
const leopard = fs.readFileSync(path.join(modelsDir, 'Leopard.glb')).toString('base64');
const langur = fs.readFileSync(path.join(modelsDir, 'Langur.glb')).toString('base64');
const pangolin = fs.readFileSync(path.join(modelsDir, 'Pangolin.glb')).toString('base64');

const tsContent = `// Auto-generated 3D models embedded as Base64 for instant 0ms offline loading
export const MODELS_BASE64: Record<string, string> = {
  leopard: ${JSON.stringify(leopard)},
  langur: ${JSON.stringify(langur)},
  pangolin: ${JSON.stringify(pangolin)},
};

export function getModelBase64(speciesIdOrUrl?: string | null): string | null {
  if (!speciesIdOrUrl) return null;
  const clean = speciesIdOrUrl.toLowerCase().trim();
  if (clean.includes('leopard')) return MODELS_BASE64.leopard;
  if (clean.includes('langur')) return MODELS_BASE64.langur;
  if (clean.includes('pangolin')) return MODELS_BASE64.pangolin;
  return null;
}
`;

fs.writeFileSync(path.join(modelsDir, 'modelsBase64.ts'), tsContent, 'utf8');
console.log('modelsBase64.ts successfully generated! Size:', fs.statSync(path.join(modelsDir, 'modelsBase64.ts')).size);
