#!/usr/bin/env bun
/**
 * scripts/check-context-budget.ts
 *
 * Validador autoritativo da janela de contexto do AGENTS.md e integridade dos links Hub & Spoke.
 * Executado via Bun: bun run scripts/check-context-budget.ts
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const MAX_CHAR_CEILING = 9500;
const WARN_CHAR_THRESHOLD = 8500;
const AGENTS_MD_PATH = resolve(process.cwd(), 'AGENTS.md');

if (!existsSync(AGENTS_MD_PATH)) {
	console.error('ERRO: AGENTS.md não encontrado na raiz do repositório.');
	process.exit(1);
}

const content = readFileSync(AGENTS_MD_PATH, 'utf-8');
const lines = content.split('\n');
const charCount = content.length;
const wordCount = content.split(/\s+/).filter(Boolean).length;
const estTokens = Math.round(charCount / 3.5);

console.log('Auditoria de Janela de Contexto (AGENTS.md):');
console.log(`- Linhas: ${lines.length}`);
console.log(`- Palavras: ${wordCount}`);
console.log(`- Caracteres: ${charCount} (Teto Máximo: ${MAX_CHAR_CEILING})`);
console.log(`- Tokens Estimados: ~${estTokens}`);

let hasError = false;

// 1. Verificação de Orçamento de Contexto
if (charCount > MAX_CHAR_CEILING) {
	console.error(
		`FALHA: AGENTS.md excedeu o teto de ${MAX_CHAR_CEILING} caracteres (${charCount}). Risco de saturação da janela de contexto.`
	);
	hasError = true;
} else if (charCount > WARN_CHAR_THRESHOLD) {
	console.warn(
		`AVISO: AGENTS.md está próximo do limite recomendado (${charCount}/${MAX_CHAR_CEILING}).`
	);
} else {
	console.log('Conformidade de Orçamento de Contexto: OK');
}

// 2. Verificação de Integridade dos Links Markdown
const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
let match: RegExpExecArray | null;
const linksFound: Array<{ text: string; url: string }> = [];

while ((match = linkRegex.exec(content)) !== null) {
	const url = match[2].trim();
	// Ignorar links externos HTTP/HTTPS ou âncoras locais
	if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('#')) {
		linksFound.push({ text: match[1], url });
	}
}

console.log(`\nVerificação de Integridade de Links (${linksFound.length} links locais):`);
let brokenLinksCount = 0;

for (const { text, url } of linksFound) {
	// Limpar parâmetros ou fragmentos de âncora (#)
	const cleanUrl = url.split('#')[0];
	if (!cleanUrl) continue;

	const targetPath = resolve(dirname(AGENTS_MD_PATH), cleanUrl);
	if (!existsSync(targetPath)) {
		console.error(`- LINK QUEBRADO: [${text}](${url}) -> destino inexistente: ${targetPath}`);
		brokenLinksCount++;
		hasError = true;
	}
}

if (brokenLinksCount === 0) {
	console.log('Integridade de Links Locais: 100% dos links apontam para arquivos existentes.');
} else {
	console.error(`FALHA: ${brokenLinksCount} link(s) quebrado(s) detectado(s) em AGENTS.md.`);
}

// 3. Verificação dos Mandamentos Inegociáveis
const requiredMandamentos = [
	'Runtime Bun Exclusivo',
	'Zero Trust',
	'Composição por Entidades e Componentes',
	'Sem Emojis',
	'Sem Cards Genéricos',
	'Sem Travessões como Separadores',
	'Sem Bullets Decorativos',
	'TypeScript Nativo',
	'Proibição de Commits e Pushes Autônomos',
	'Filosofia Ponytail'
];

console.log('\nVerificação dos Mandamentos Inegociáveis:');
let missingMandamentos = 0;
for (const mandamento of requiredMandamentos) {
	if (!content.includes(mandamento)) {
		console.error(`- MANDAMENTO AUSENTE: "${mandamento}"`);
		missingMandamentos++;
		hasError = true;
	}
}

if (missingMandamentos === 0) {
	console.log('Todos os 10 Mandamentos Inegociáveis estão presentes e ativos.');
}

if (hasError) {
	console.error('\nAuditoria falhou com erros de integridade ou estouro de contexto.');
	process.exit(1);
}

console.log('\nAuditoria concluída com sucesso: Hub AGENTS.md enxuto e blindado.');
