// Remove BOM (U+FEFF), zero-width space (U+200B) e espacos em branco que podem
// grudar num valor de env ao gravar via CLI no Windows. Quebra o ethers, que
// interpreta o endereco como nome ENS invalido.
export function cleanEnv(s) {
  return (s || "").replace(/[\uFEFF\u200B\s]/g, "");
}
