// Custom script to start Vite with proper environment variables
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file's directory (equivalent to __dirname in CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up environment
process.env.NODE_ENV = 'development';
process.env.VITE_CJS_IGNORE_WARNING = 'true';

// Path to the Vite executable
const viteBinPath = path.resolve(__dirname, 'node_modules', '.bin', 'vite');

// Start Vite dev server with safer options
const viteProcess = spawn(viteBinPath, ['--force'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    // Use safer node options
    NODE_OPTIONS: '--no-warnings'
  }
});

viteProcess.on('error', (error) => {
  console.error('Failed to start Vite:', error);
  process.exit(1);
});

viteProcess.on('close', (code) => {
  console.log(`Vite process exited with code ${code}`);
  process.exit(code);
}); 