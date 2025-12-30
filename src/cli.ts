import {
  readFileSync,
  writeFileSync,
  existsSync,
  statSync,
  readdirSync,
} from 'fs';
import { join, resolve, basename } from 'path';
import postcss from 'postcss';
import pxtorem from './index';
import type { Options } from './types';

interface CliOptions {
  input?: string;
  output?: string;
  config?: string;
  baseSize?: number;
  toUnit?: string;
  fromUnit?: string;
  precision?: number;
  properties?: string[];
  skipSelectors?: string[];
  minValue?: number;
  maxValue?: number;
  convertMediaQueries?: boolean;
  replaceOriginal?: boolean;
  verbose?: boolean;
  help?: boolean;
  version?: boolean;
}

const VERSION = '2.0.0';

const HELP_TEXT = `
pxtorem-css - Convert px to rem/em/vw/vh in CSS files

Usage:
  pxtorem [options] <input>

Options:
  -i, --input <path>       Input CSS file or directory
  -o, --output <path>      Output file or directory (default: overwrite input)
  -c, --config <path>      Path to config file (JSON)
  -b, --base-size <n>      Base font size (default: 16)
  -u, --to-unit <unit>     Target unit: rem, em, vw, vh, vmin, vmax, % (default: rem)
  -f, --from-unit <unit>   Source unit (default: px)
  -p, --precision <n>      Decimal precision (default: 5)
  --properties <list>      Comma-separated properties to convert (default: *)
  --skip-selectors <list>  Comma-separated selectors to skip
  --min-value <n>          Minimum px value to convert (default: 0)
  --max-value <n>          Maximum px value to convert (default: Infinity)
  --media-queries          Convert px in media queries
  --no-replace             Add rem as fallback instead of replacing
  -v, --verbose            Show conversion details
  -h, --help               Show this help message
  --version                Show version number

Examples:
  pxtorem style.css
  pxtorem style.css -b 16 -u rem -p 5
  pxtorem -i src/styles -o dist/styles
  pxtorem style.css --properties "font-size,margin,padding"
  pxtorem style.css --skip-selectors "body,.no-convert"
  pxtorem style.css --min-value 2 --media-queries
`;

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {};
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    switch (arg) {
      case '-i':
      case '--input':
        options.input = args[++i];
        break;
      case '-o':
      case '--output':
        options.output = args[++i];
        break;
      case '-c':
      case '--config':
        options.config = args[++i];
        break;
      case '-b':
      case '--base-size':
        options.baseSize = parseFloat(args[++i]);
        break;
      case '-u':
      case '--to-unit':
        options.toUnit = args[++i] as Options['toUnit'];
        break;
      case '-p':
      case '--precision':
        options.precision = parseInt(args[++i], 10);
        break;
      case '-f':
      case '--from-unit':
        options.fromUnit = args[++i];
        break;
      case '--properties':
        options.properties = args[++i].split(',').map((s) => s.trim());
        break;
      case '--skip-selectors':
        options.skipSelectors = args[++i].split(',').map((s) => s.trim());
        break;
      case '--min-value':
        options.minValue = parseFloat(args[++i]);
        break;
      case '--max-value':
        options.maxValue = parseFloat(args[++i]);
        break;
      case '--media-queries':
        options.convertMediaQueries = true;
        break;
      case '--no-replace':
        options.replaceOriginal = false;
        break;
      case '-v':
      case '--verbose':
        options.verbose = true;
        break;
      case '-h':
      case '--help':
        options.help = true;
        break;
      case '--version':
        options.version = true;
        break;
      default:
        if (!arg.startsWith('-') && !options.input) {
          options.input = arg;
        } else if (arg.startsWith('-')) {
          console.error(`Error: Unknown option "${arg}"`);
          console.log('Use --help to see available options.');
          process.exit(1);
        }
        break;
    }
    i++;
  }

  return options;
}

const VALID_UNITS = ['rem', 'em', 'vw', 'vh', 'vmin', 'vmax', '%'];

function validateOptions(options: CliOptions): void {
  const errors: string[] = [];

  // Validate toUnit
  if (options.toUnit && !VALID_UNITS.includes(options.toUnit)) {
    errors.push(
      `Invalid --to-unit "${options.toUnit}". Valid values: ${VALID_UNITS.join(', ')}`
    );
  }

  // Validate baseSize
  if (options.baseSize !== undefined) {
    if (isNaN(options.baseSize) || options.baseSize <= 0) {
      errors.push('--base-size must be a positive number');
    }
  }

  // Validate precision
  if (options.precision !== undefined) {
    if (
      isNaN(options.precision) ||
      options.precision < 0 ||
      !Number.isInteger(options.precision)
    ) {
      errors.push('--precision must be a non-negative integer');
    }
  }

  // Validate minValue
  if (options.minValue !== undefined && isNaN(options.minValue)) {
    errors.push('--min-value must be a number');
  }

  // Validate maxValue
  if (options.maxValue !== undefined && isNaN(options.maxValue)) {
    errors.push('--max-value must be a number');
  }

  // Validate min < max
  if (
    options.minValue !== undefined &&
    options.maxValue !== undefined &&
    options.minValue > options.maxValue
  ) {
    errors.push('--min-value cannot be greater than --max-value');
  }

  // Validate config file exists
  if (options.config && !existsSync(options.config)) {
    errors.push(`Config file not found: ${options.config}`);
  }

  if (errors.length > 0) {
    console.error('Validation errors:');
    errors.forEach((err) => console.error(`  ✗ ${err}`));
    process.exit(1);
  }
}

function loadConfig(configPath: string): Partial<Options> {
  try {
    const configContent = readFileSync(configPath, 'utf-8');
    return JSON.parse(configContent);
  } catch (error) {
    console.error(`Error loading config file: ${configPath}`, error);
    process.exit(1);
  }
}

function findConfigFile(): string | null {
  const configNames = [
    'pxtorem.config.json',
    'pxtorem.json',
    '.pxtoremrc.json',
  ];
  for (const name of configNames) {
    const configPath = resolve(process.cwd(), name);
    if (existsSync(configPath)) {
      return configPath;
    }
  }
  return null;
}

function getCssFiles(inputPath: string): string[] {
  const fullPath = resolve(process.cwd(), inputPath);

  if (!existsSync(fullPath)) {
    console.error(`Error: Path not found: ${inputPath}`);
    process.exit(1);
  }

  const stat = statSync(fullPath);

  if (stat.isFile()) {
    return [fullPath];
  }

  if (stat.isDirectory()) {
    const files: string[] = [];
    const entries = readdirSync(fullPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && /\.(css|scss|sass|less)$/.test(entry.name)) {
        files.push(join(fullPath, entry.name));
      } else if (entry.isDirectory()) {
        files.push(...getCssFiles(join(fullPath, entry.name)));
      }
    }

    return files;
  }

  return [];
}

async function processFile(
  inputFile: string,
  outputFile: string,
  options: Options
): Promise<{ converted: number; skipped: number }> {
  const css = readFileSync(inputFile, 'utf-8');
  let stats = { converted: 0, skipped: 0 };

  const result = await postcss([
    pxtorem({
      ...options,
      onConversionComplete: (report) => {
        stats = {
          converted: report.convertedDeclarations,
          skipped: report.skippedDeclarations,
        };
      },
    }),
  ]).process(css, { from: inputFile, to: outputFile });

  writeFileSync(outputFile, result.css);

  return stats;
}

async function main() {
  const args = process.argv.slice(2);
  const cliOptions = parseArgs(args);

  if (cliOptions.version) {
    console.log(`pxtorem-css v${VERSION}`);
    process.exit(0);
  }

  if (cliOptions.help || !cliOptions.input) {
    console.log(HELP_TEXT);
    process.exit(cliOptions.help ? 0 : 1);
  }

  // Validate options
  validateOptions(cliOptions);

  // Load config file
  let configOptions: Partial<Options> = {};
  const configPath = cliOptions.config || findConfigFile();
  if (configPath) {
    configOptions = loadConfig(configPath);
    if (cliOptions.verbose) {
      console.log(`Using config: ${configPath}`);
    }
  }

  // Merge options: config < cli
  const options: Options = {
    ...configOptions,
    ...(cliOptions.baseSize !== undefined && { baseSize: cliOptions.baseSize }),
    ...(cliOptions.toUnit !== undefined && {
      toUnit: cliOptions.toUnit as Options['toUnit'],
    }),
    ...(cliOptions.fromUnit !== undefined && { fromUnit: cliOptions.fromUnit }),
    ...(cliOptions.precision !== undefined && {
      precision: cliOptions.precision,
    }),
    ...(cliOptions.properties !== undefined && {
      properties: cliOptions.properties,
    }),
    ...(cliOptions.skipSelectors !== undefined && {
      skipSelectors: cliOptions.skipSelectors,
    }),
    ...(cliOptions.minValue !== undefined && { minValue: cliOptions.minValue }),
    ...(cliOptions.maxValue !== undefined && { maxValue: cliOptions.maxValue }),
    ...(cliOptions.convertMediaQueries !== undefined && {
      convertMediaQueries: cliOptions.convertMediaQueries,
    }),
    ...(cliOptions.replaceOriginal !== undefined && {
      replaceOriginal: cliOptions.replaceOriginal,
    }),
    ...(cliOptions.verbose !== undefined && { verbose: cliOptions.verbose }),
  };

  const inputFiles = getCssFiles(cliOptions.input);

  if (inputFiles.length === 0) {
    console.error('No CSS files found.');
    process.exit(1);
  }

  console.log(`\nProcessing ${inputFiles.length} file(s)...\n`);

  let totalConverted = 0;
  let totalSkipped = 0;

  for (const inputFile of inputFiles) {
    let outputFile: string;

    if (cliOptions.output) {
      const outputPath = resolve(process.cwd(), cliOptions.output);
      const outputStat = existsSync(outputPath) && statSync(outputPath);

      if (outputStat && outputStat.isDirectory()) {
        outputFile = join(outputPath, basename(inputFile));
      } else if (inputFiles.length === 1) {
        outputFile = outputPath;
      } else {
        outputFile = join(outputPath, basename(inputFile));
      }
    } else {
      outputFile = inputFile;
    }

    try {
      const stats = await processFile(inputFile, outputFile, options);
      totalConverted += stats.converted;
      totalSkipped += stats.skipped;

      const relativePath = inputFile.replace(process.cwd(), '.');
      console.log(
        `✓ ${relativePath} (${stats.converted} converted, ${stats.skipped} skipped)`
      );
    } catch (error) {
      console.error(`✗ ${inputFile}: ${(error as Error).message}`);
    }
  }

  console.log(
    `\nDone! Converted: ${totalConverted}, Skipped: ${totalSkipped}\n`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
