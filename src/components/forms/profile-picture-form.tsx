
'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, UploadCloud, UserCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/context/role-context';
import { auth, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateUserProfile } from '@/lib/firestoreService';
import { updateProfile } from 'firebase/auth';
import type { UserProfile } from '@/lib/firestoreService';
import { cn } from '@/lib/utils';

interface ProfilePictureFormProps {
  user: { uid: string; email: string | null; displayName: string | null; };
  userProfile: UserProfile;
}

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'];

export function ProfilePictureForm({ user, userProfile }: ProfilePictureFormProps) {
  const { toast } = useToast();
  const { refetchUserProfile } = useRole();
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(userProfile.photoURL || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (event.target) {
      event.target.value = '';
    }

    if (!file) return;

    console.log(`[ProfileUpload] Validating file: ${file.name}, size: ${file.size}, type: ${file.type}`);
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const errorMsg = `File is too large. Max size is ${MAX_FILE_SIZE_MB}MB.`;
      console.error("[ProfileUpload] Validation failed:", errorMsg);
      setError(errorMsg);
      toast({ title: "Invalid File", description: errorMsg, variant: "destructive" });
      return;
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      const errorMsg = 'Invalid file type. Only JPG, PNG, WEBP, and HEIC formats are supported.';
      console.error("[ProfileUpload] Validation failed:", errorMsg);
      setError(errorMsg);
      toast({ title: "Invalid File", description: errorMsg, variant: "destructive" });
      return;
    }

    console.log("[ProfileUpload] File validation successful.");
    setError(null);
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const onInvalid = (errors: any) => {
    console.error('[ProfileUpload] Form validation failed:', errors);
    toast({
      title: 'Invalid File',
      description: 'The selected file could not be uploaded. Please check the file type and size.',
      variant: 'destructive',
    });
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({ title: "No File Selected", description: "Please choose a file to upload.", variant: "destructive" });
      return;
    }
    if (!user?.uid) {
        toast({ title: "Authentication Error", description: "User could not be identified.", variant: "destructive" });
        return;
    }

    setIsUploading(true);
    let success = false;
    console.log(`[ProfileUpload] Starting upload for user ${user.uid}, file: ${selectedFile.name}`);
    console.log(`[ProfileUpload] File details - Size: ${selectedFile.size}, Type: ${selectedFile.type}`);

    try {
      const storageRef = ref(storage, `profile-pictures/${user.uid}/${selectedFile.name}`);
      console.log("[ProfileUpload] Storage reference created:", storageRef.fullPath);
      
      const uploadResult = await uploadBytes(storageRef, selectedFile);
      console.log("[ProfileUpload] Upload successful!", uploadResult);
      
      const downloadURL = await getDownloadURL(uploadResult.ref);
      console.log("[ProfileUpload] Got download URL:", downloadURL);

      if (auth.currentUser) {
        console.log("[ProfileUpload] Updating Firebase Auth profile...");
        await updateProfile(auth.currentUser, { photoURL: downloadURL });
        console.log("[ProfileUpload] Firebase Auth profile updated.");
      }

      console.log("[ProfileUpload] Updating Firestore user profile...");
      await updateUserProfile(user.uid, { photoURL: downloadURL });
      console.log("[ProfileUpload] Firestore user profile updated.");
      
      toast({
        title: 'Profile Picture Updated',
        description: 'Your new profile picture has been saved.',
      });
      setSelectedFile(null); 
      success = true;

    } catch (error: any) {
      console.error("[ProfileUpload] Full error object:", error);
      
      let title = 'Upload Failed';
      let description = 'Could not upload profile picture. Please try again.';

      if (error.code) {
        switch (error.code) {
          case 'storage/unauthorized':
            description = "Permission denied. Please ensure your Storage Security Rules are deployed and correct.";
            break;
          case 'storage/object-not-found':
            description = "The file could not be found during the upload process.";
            break;
          case 'storage/unknown':
            title = 'Network or CORS Error';
            description = "The upload failed due to a network or CORS issue. Please ensure you have applied the CORS configuration to your bucket using the `gcloud` command and the `cors.json` file.";
            break;
          default:
            description = `An unexpected error occurred: ${error.message}`;
        }
      }

      toast({
        title: title,
        description: description,
        variant: 'destructive',
        duration: 9000,
      });
    } finally {
      setIsUploading(false);
      console.log(`[ProfileUpload] Upload process finished. Success: ${success}`);
      if (success) {
        await refetchUserProfile();
      }
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreview(userProfile.photoURL || null);
    setError(null);
  };

  const avatarPlaceholder = userProfile?.displayName?.split(' ').map(n => n[0]).join('') || 'U';

  return (
    <Card className="w-full max-w-2xl shadow-light">
      <CardHeader>
        <CardTitle className="font-headline flex items-center">
          <UserCircle className="mr-2 h-5 w-5 text-primary" />
          Profile Picture
        </CardTitle>
        <CardDescription>Update your profile photo. This will be visible to others on the platform.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative group">
            <Avatar className="h-32 w-32 border-4 border-primary/50">
              <AvatarImage src={preview || undefined} alt={userProfile.displayName || ''} data-ai-hint="avatar person" />
              <AvatarFallback className="text-4xl">{avatarPlaceholder}</AvatarFallback>
            </Avatar>
             <button
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={cn(
                "absolute inset-0 bg-black/50 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:opacity-100",
                isUploading && "cursor-not-allowed"
              )}
              aria-label="Change profile picture"
            >
              <UploadCloud className="h-8 w-8 text-white" />
            </button>
          </div>
          <div className="flex-grow w-full text-center sm:text-left">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept={ALLOWED_MIME_TYPES.join(',')}
              className="hidden"
              disabled={isUploading}
            />
            {selectedFile ? (
              <div>
                <p className="font-semibold text-foreground">Ready to upload:</p>
                <p className="text-sm text-muted-foreground truncate">{selectedFile.name}</p>
                 <p className="text-xs text-muted-foreground">{Math.round(selectedFile.size / 1024)} KB</p>
              </div>
            ) : (
              <div>
                <h3 className="font-semibold text-lg">Click image to upload</h3>
                <p className="text-sm text-muted-foreground">Max {MAX_FILE_SIZE_MB}MB. Supports JPG, PNG, WEBP, HEIC.</p>
              </div>
            )}
             {error && (
              <p className="mt-2 text-sm font-medium text-destructive">{error}</p>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
         {selectedFile && (
          <Button variant="ghost" onClick={handleCancel} disabled={isUploading}>
            <XCircle className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        )}
        <Button onClick={handleUpload} disabled={isUploading || !selectedFile}>
          {isUploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <UploadCloud className="mr-2 h-4 w-4" />
          )}
          {isUploading ? 'Uploading...' : 'Upload & Save'}
        </Button>
      </CardFooter>
    </Card>
  );
}
