import { readdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT_DIR = resolve(import.meta.dir, '..');
const SGDD_FILE = join(ROOT_DIR, 'docs', 'sgdd', 'sgdd.md');
const BADGES_DIR = join(ROOT_DIR, 'docs', 'assets', 'badges');

// Paleta oficial de tokens de src/routes/layout.css
const THEME: Record<string, { fill: string; stroke: string; textColor: string }> = {
	FAF4EB: {
		fill: '#FAF4EB',
		stroke: '#d4c0a5',
		textColor: '#271602'
	},
	'4C2BB1': {
		fill: '#4C2BB1',
		stroke: '#3c2091',
		textColor: '#FFFFFF'
	},
	E2931D: {
		fill: '#E2931D',
		stroke: '#cc7e12',
		textColor: '#271602'
	}
};

function estimateTextWidth(text: string): number {
	let width = 0;
	for (const char of text) {
		if (/[il1.,;:!'|]/.test(char)) width += 3.6;
		else if (/[ \-_()[\]]/.test(char)) width += 4.2;
		else if (/[mwMW]/.test(char)) width += 9.6;
		else if (/[A-Z]/.test(char)) width += 7.8;
		else if (/[a-z0-9]/.test(char)) width += 6.5;
		else width += 6.8; // acentos e caracteres especiais
	}
	// 4px de padding em cada lado (8px total) para um visual super ajustado e sem "barriga"
	return Math.ceil(width) + 8;
}

function generateSvg(text: string, colorHex: string): string {
	const config = THEME[colorHex] || {
		fill: `#${colorHex}`,
		stroke: `#${colorHex}`,
		textColor: '#FFFFFF'
	};

	const width = estimateTextWidth(text);
	const height = 18;
	const rx = 3;

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${text}">
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="${rx}" fill="${config.fill}" stroke="${config.stroke}" stroke-width="1" />
  <text x="${width / 2}" y="9" fill="${config.textColor}" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="12" font-weight="600" text-anchor="middle" dominant-baseline="central">${text}</text>
</svg>`;
}

const NEW_BADGES: Array<{ file: string; text: string; colorHex: string }> = [
	{ file: 'campo_do_código_da_sala.svg', text: 'campo do código da sala', colorHex: 'FAF4EB' },
	{ file: 'diálogo_de_apelido.svg', text: 'diálogo de apelido', colorHex: 'FAF4EB' },
	{ file: 'digitar_o_apelido.svg', text: 'digitar o apelido', colorHex: '4C2BB1' },
	{ file: 'handshake_com_o_servidor.svg', text: 'handshake com o servidor', colorHex: '4C2BB1' },
	{ file: 'botão_de_iniciar_partida.svg', text: 'botão de iniciar partida', colorHex: 'FAF4EB' },
	{ file: 'aviso_de_desconexão.svg', text: 'aviso de desconexão', colorHex: 'FAF4EB' },
	{
		file: 'aviso_sonoro_de_desconexão.svg',
		text: 'aviso sonoro de desconexão',
		colorHex: 'E2931D'
	},
	{ file: 'aguardar_a_reconexão.svg', text: 'aguardar a reconexão', colorHex: '4C2BB1' },
	{ file: 'desfazer_a_sala.svg', text: 'desfazer a sala', colorHex: '4C2BB1' },
	{ file: 'reassunção_de_assento.svg', text: 'reassunção de assento', colorHex: '4C2BB1' },
	{ file: 'aprovação_do_anfitrião.svg', text: 'aprovação do anfitrião', colorHex: '4C2BB1' },
	{ file: 'vitória_por_wo.svg', text: 'vitória por WO', colorHex: '4C2BB1' },
	{
		file: 'fanfarra_de_vitória_por_wo.svg',
		text: 'fanfarra de vitória por WO',
		colorHex: 'E2931D'
	},
	{
		file: 'expulsar_participante_da_sala.svg',
		text: 'expulsar participante da sala',
		colorHex: '4C2BB1'
	},
	{
		file: 'botão_para_expulsar_participante.svg',
		text: 'botão para expulsar participante',
		colorHex: 'FAF4EB'
	}
];

function run() {
	// Garante que todas as badges novas necessárias estejam criadas
	for (const b of NEW_BADGES) {
		const targetPath = join(BADGES_DIR, b.file);
		writeFileSync(targetPath, generateSvg(b.text, b.colorHex), 'utf-8');
	}

	console.log('Lendo SVGs existentes em:', BADGES_DIR);
	const files = readdirSync(BADGES_DIR).filter((f) => f.endsWith('.svg'));

	for (const file of files) {
		const filePath = join(BADGES_DIR, file);
		const content = readFileSync(filePath, 'utf-8');

		const ariaMatch = content.match(/aria-label="([^"]+)"/);
		const fillMatch = content.match(/fill="(#[A-Fa-f0-9]{6})"/);

		if (!ariaMatch || !fillMatch) continue;

		const text = ariaMatch[1];
		const hex = fillMatch[1].replace('#', '').toUpperCase();

		const updatedSvg = generateSvg(text, hex);
		writeFileSync(filePath, updatedSvg, 'utf-8');
	}

	console.log(
		`Regenerados ${files.length} SVGs com padding compacto, fonte ajustada e alinhamento ótico.`
	);

	// Normaliza o SGDD para sintaxe Markdown limpa sem atributos align
	console.log('Atualizando SGDD:', SGDD_FILE);
	let sgddContent = readFileSync(SGDD_FILE, 'utf-8');

	// Remove align das tags <img> convertendo para sintaxe limpa ![alt](path)
	sgddContent = sgddContent.replace(
		/<img\s+src="([^"]+)"(?:\s+align="[^"]*")?\s+alt="([^"]*)"\s*\/>/g,
		(match, path, alt) => `![${alt}](${path})`
	);

	writeFileSync(SGDD_FILE, sgddContent, 'utf-8');
}

run();
