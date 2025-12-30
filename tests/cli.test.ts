import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { writeFileSync, readFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

const CLI_PATH = join(__dirname, '../dist/cli.js');
const TEST_DIR = join(__dirname, '../test-cli-temp');

describe('CLI', () => {
  beforeEach(() => {
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('should show help with --help flag', () => {
    const output = execSync(`node ${CLI_PATH} --help`, { encoding: 'utf-8' });
    expect(output).toContain('pxtorem-css');
    expect(output).toContain('Usage:');
    expect(output).toContain('Options:');
  });

  it('should show version with --version flag', () => {
    const output = execSync(`node ${CLI_PATH} --version`, {
      encoding: 'utf-8',
    });
    expect(output).toContain('pxtorem-css');
  });

  it('should convert a CSS file', () => {
    const inputFile = join(TEST_DIR, 'input.css');
    const outputFile = join(TEST_DIR, 'output.css');

    writeFileSync(inputFile, '.test { font-size: 16px; margin: 32px; }');

    execSync(`node ${CLI_PATH} -i ${inputFile} -o ${outputFile}`, {
      encoding: 'utf-8',
    });

    const result = readFileSync(outputFile, 'utf-8');
    expect(result).toContain('1rem');
    expect(result).toContain('2rem');
  });

  it('should use custom base size', () => {
    const inputFile = join(TEST_DIR, 'input.css');
    const outputFile = join(TEST_DIR, 'output.css');

    writeFileSync(inputFile, '.test { font-size: 20px; }');

    execSync(`node ${CLI_PATH} -i ${inputFile} -o ${outputFile} -b 10`, {
      encoding: 'utf-8',
    });

    const result = readFileSync(outputFile, 'utf-8');
    expect(result).toContain('2rem');
  });

  it('should convert to different target unit', () => {
    const inputFile = join(TEST_DIR, 'input.css');
    const outputFile = join(TEST_DIR, 'output.css');

    writeFileSync(inputFile, '.test { font-size: 16px; }');

    execSync(`node ${CLI_PATH} -i ${inputFile} -o ${outputFile} -u em`, {
      encoding: 'utf-8',
    });

    const result = readFileSync(outputFile, 'utf-8');
    expect(result).toContain('1em');
  });

  it('should use config file', () => {
    const inputFile = join(TEST_DIR, 'input.css');
    const outputFile = join(TEST_DIR, 'output.css');
    const configFile = join(TEST_DIR, 'pxtorem.config.json');

    writeFileSync(inputFile, '.test { font-size: 20px; }');
    writeFileSync(configFile, JSON.stringify({ baseSize: 10, toUnit: 'em' }));

    execSync(
      `node ${CLI_PATH} -i ${inputFile} -o ${outputFile} -c ${configFile}`,
      {
        encoding: 'utf-8',
      }
    );

    const result = readFileSync(outputFile, 'utf-8');
    expect(result).toContain('2em');
  });

  it('should respect min-value option', () => {
    const inputFile = join(TEST_DIR, 'input.css');
    const outputFile = join(TEST_DIR, 'output.css');

    writeFileSync(inputFile, '.test { font-size: 16px; border: 1px solid; }');

    execSync(
      `node ${CLI_PATH} -i ${inputFile} -o ${outputFile} --min-value 2`,
      {
        encoding: 'utf-8',
      }
    );

    const result = readFileSync(outputFile, 'utf-8');
    expect(result).toContain('1rem');
    expect(result).toContain('1px'); // Should not be converted
  });
});
