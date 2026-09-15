import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { fileURLToPath } from 'url';
import { app } from 'electron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class Web2ApiServerManager {
  private childProcess: ChildProcess | null = null;
  private isStarting = false;

  /**
   * Check if Web2API is already running on port 8081
   */
  public async isServerRunning(port = 8081): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: '/',
          method: 'GET',
          timeout: 800
        },
        (res) => {
          resolve(res.statusCode === 200 || res.statusCode === 404);
        }
      );

      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      req.end();
    });
  }

  /**
   * Start the Web2API Python server if not already running (completely silent background)
   */
  public async startServer() {
    if (this.isStarting) return;
    this.isStarting = true;

    try {
      const running = await this.isServerRunning(8081);
      if (running) {
        console.log('[Web2API Server] Already running on port 8081.');
        this.isStarting = false;
        return;
      }

      const appRoot = app ? app.getAppPath() : process.cwd();

      // Locate gemini_web2api.py
      const possiblePaths = [
        path.join(appRoot, 'gemini-web2api', 'gemini_web2api.py'),
        path.join(process.cwd(), 'gemini-web2api', 'gemini_web2api.py'),
        path.join(__dirname, '..', 'gemini-web2api', 'gemini_web2api.py'),
        path.join(__dirname, '..', '..', 'gemini-web2api', 'gemini_web2api.py')
      ];

      let scriptPath = '';
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          scriptPath = p;
          break;
        }
      }

      if (!scriptPath) {
        console.warn('[Web2API Server] gemini_web2api.py not found in possible locations.');
        this.isStarting = false;
        return;
      }

      console.log(`[Web2API Server] Launching Python background server (hidden): ${scriptPath}`);

      const workingDir = path.dirname(scriptPath);
      const pythonCommands = process.platform === 'win32' ? ['python', 'pythonw', 'py'] : ['python3', 'python'];
      
      let serverUp = false;

      for (const pyCmd of pythonCommands) {
        try {
          const proc = spawn(pyCmd, [scriptPath], {
            cwd: workingDir,
            detached: false,
            stdio: 'ignore',
            shell: process.platform === 'win32',
            windowsHide: true
          });

          proc.on('error', (err) => {
            console.warn(`[Web2API Server] ${pyCmd} spawn error:`, err.message);
          });

          proc.on('exit', (code, signal) => {
            console.log(`[Web2API Server] Process exited with code ${code}, signal ${signal}`);
            if (this.childProcess === proc) {
              this.childProcess = null;
            }
          });

          this.childProcess = proc;

          // Poll for server readiness for up to 5 seconds
          for (let i = 0; i < 15; i++) {
            await new Promise(r => setTimeout(r, 350));
            if (await this.isServerRunning(8081)) {
              serverUp = true;
              console.log(`[Web2API Server] Background process started successfully using ${pyCmd} on port 8081.`);
              break;
            }
            if (!this.childProcess) break; // Exited early
          }

          if (serverUp) break;
        } catch (e) {
          console.warn(`[Web2API Server] Could not start with ${pyCmd}:`, e);
        }
      }

      if (!serverUp) {
        console.warn('[Web2API Server] Warning: Server port 8081 not responding yet after launch.');
      }
    } catch (e) {
      console.error('[Web2API Server] Error starting server:', e);
    } finally {
      this.isStarting = false;
    }
  }

  /**
   * Stop child process on exit
   */
  public stopServer() {
    if (this.childProcess) {
      try {
        console.log('[Web2API Server] Stopping background python process...');
        if (process.platform === 'win32' && this.childProcess.pid) {
          import('child_process').then(({ exec }) => {
            exec(`taskkill /pid ${this.childProcess?.pid} /T /F`, () => {});
          });
        } else {
          this.childProcess.kill();
        }
      } catch (e) {
        console.warn('[Web2API Server] Error stopping process:', e);
      }
      this.childProcess = null;
    }
  }
}

export const web2apiServerManager = new Web2ApiServerManager();
