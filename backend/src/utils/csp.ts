import crypto from 'crypto';
import fs from 'fs';
import { Request, Response } from 'express';

// Function to generate a random nonce
export const generateNonce = (): string => {
  return crypto.randomBytes(16).toString('base64');
};

// Function to serve a file with a Content Security Policy (CSP) header
export const serveWithCSP = (req: Request, res: Response, buildPath: string): void => {
  const nonce = generateNonce();

  fs.readFile(buildPath, 'utf8', (err, data) => {
    if (err) {
      console.error(`Error reading file: ${buildPath}`, err);
      res.status(500).send('Server Error');
      return;
    }

    // Replace placeholder with the generated nonce
    const result = data.replace('content=""', `content="${nonce}"`);

    // Set CSP headers with the generated nonce
    res.setHeader(
      'Content-Security-Policy',
      `default-src 'self';
       style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com;
       font-src 'self' https://fonts.gstatic.com;
       script-src 'self' 'nonce-${nonce}';
       connect-src 'self' https://localhost:5000 https://192.168.50.221:5000;
       media-src 'self' https://localhost:5000 https://192.168.50.221:5000;`
    );

    res.send(result);
  });
};
