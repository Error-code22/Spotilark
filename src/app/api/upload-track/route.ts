import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

import { createClient } from '@/lib/supabase/server';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user with fallback for mobile resilience
    let { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const { data: { session } } = await supabase.auth.getSession();
      user = session?.user || null;
    }

    if (!user) {
      console.error('UPLOAD: Unauthorized');
      return NextResponse.json({ error: 'Unauthorized. Please log in to upload.' }, { status: 401 });
    }

    const formData = await request.formData();
    console.log('Received formData:', formData);

    const fileEntry = formData.get('file');
    const file = fileEntry instanceof File ? fileEntry : null; // Ensure it's a File object
    const url = formData.get('url') as string;
    const resourceTypeParam = formData.get('resource_type') as string || 'auto'; // Default to 'auto'

    console.log('File:', file);
    console.log('URL:', url);
    console.log('Resource type param:', resourceTypeParam);

    // Validate that either file or url is provided (but not both)
    if (!file && !url) {
      console.log('No file or URL provided');
      return NextResponse.json({ error: 'No file or URL provided.' }, { status: 400 });
    }

    if (file && url) {
      console.log('Both file and URL provided');
      return NextResponse.json({ error: 'Provide either a file or a URL, not both.' }, { status: 400 });
    }

    // Map resource types for Cloudinary
    let resourceType = 'auto';
    if (resourceTypeParam === 'video') {
      resourceType = 'video'; // For audio files
    } else if (resourceTypeParam === 'image') {
      resourceType = 'image';
    }

    console.log('Mapped resource type:', resourceType);

    // If file is provided, validate its type
    if (file) {
      console.log('Processing file upload');
      const allowedAudioTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/flac'];
      const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      console.log('File type:', file.type);

      if (!allowedAudioTypes.includes(file.type) && !allowedImageTypes.includes(file.type)) {
        console.log('Invalid file type:', file.type);
        return NextResponse.json({ error: `Invalid file type: ${file.type}. Only audio and image files are allowed.` }, { status: 400 });
      }

      // Ensure file.stream() is available
      if (typeof file.stream !== 'function') {
        console.error('File object does not have a stream() method.', file);
        return NextResponse.json({ error: 'File streaming not supported.' }, { status: 500 });
      }

      // Upload to Cloudinary
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: resourceType as any,
            folder: 'spotilark_tracks',
            timeout: 60000,
            use_filename: false,
            unique_filename: true
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload stream error:', error);
              reject(error);
            } else {
              console.log('Cloudinary upload result:', result);
              resolve(result);
            }
          }
        );

        const readableStream = file.stream();
        const reader = readableStream.getReader();
        reader.read().then(function processText({ done, value }) {
          if (done) {
            uploadStream.end();
            return;
          }
          uploadStream.write(value);
          reader.read().then(processText);
        });
      });

      return NextResponse.json({ success: true, data: result });
    }
    // If URL is provided, upload from URL
    else if (url) {
      console.log('Processing URL upload');
      try {
        // Validate URL format
        new URL(url);
      } catch (urlError) {
        console.log('Invalid URL format:', url);
        return NextResponse.json({ error: 'Invalid URL format.' }, { status: 400 });
      }

      // Upload to Cloudinary from URL
      const result = await cloudinary.uploader.upload(url, {
        resource_type: resourceType as any,
        folder: 'spotilark_tracks',
        timeout: 60000,
        use_filename: true,
        unique_filename: false
      });

      return NextResponse.json({ success: true, data: result });
    }
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    return NextResponse.json({ error: error.message || 'Failed to upload file to Cloudinary.' }, { status: 500 });
  }
}