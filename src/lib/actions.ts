'use server';

import { promises as fs } from 'fs';
import { join } from 'path';

export async function getTemplate(templateName: string) {
  try {
    const filePath = join(process.cwd(), 'src', 'lib', 'templates', `${templateName}.json`);
    const fileContents = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(fileContents);
  } catch (error) {
    console.error(`Error reading template ${templateName}:`, error);
    return null;
  }
} 