import { google } from 'googleapis';

export function getOAuthClient(userToken: string) {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oAuth2Client.setCredentials({ access_token: userToken });
  return oAuth2Client;
}

export async function uploadEvidenceToDrive(params: {
  userToken: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  folderId?: string;
}) {
  const auth = getOAuthClient(params.userToken);
  const drive = google.drive({ version: 'v3', auth });

  const res = await drive.files.create({
    requestBody: {
      name: params.fileName,
      parents: params.folderId ? [params.folderId] : undefined,
    },
    media: {
      mimeType: params.mimeType,
      body: Buffer.from(params.buffer),
    } as any,
  });

  return res.data;
}
