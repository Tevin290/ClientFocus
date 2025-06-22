
'use client';

import React, { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Upload, UserCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/context/role-context';
import { auth, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateUserProfile } from '@/lib/firestoreService';
import { updateProfile } from 'firebase/auth';
import type { UserProfile } from '@/lib/firestoreService';

const profilePictureSchema = z.object({
  profileImage: z
    .any()
    .refine((files) => files?.length == 1, 'File is required.')
    .refine((files) => files?.[0]?.size <= 5000000, `Max file size is 5MB.`)
    .refine(
      (files) => ['image/jpeg', 'image/png', 'image/heic', 'image/heif'].includes(files?.[0]?.type),
      'Only .jpg, .png, and .heic formats are supported.'
    ),
});

type ProfilePictureFormValues = z.infer<typeof profilePictureSchema>;

interface ProfilePictureFormProps {
  user: { uid: string; email: string | null; displayName: string | null; };
  userProfile: UserProfile;
}

export function ProfilePictureForm({ user, userProfile }: ProfilePictureFormProps) {
  const { toast } = useToast();
  const { refetchUserProfile } = useRole();
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const form = useForm<ProfilePictureFormValues>({
    resolver: zodResolver(profilePictureSchema),
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
      form.setValue('profileImage', event.target.files as FileList, { shouldValidate: true });
    }
  };

  const onSubmit: SubmitHandler<ProfilePictureFormValues> = async (data) => {
    const file = data.profileImage[0];
    if (!file || !user?.uid) return;

    setIsUploading(true);
    console.log(`[ProfileUpload] Starting upload for user ${user.uid}, file: ${file.name}, size: ${file.size} bytes`);
    let success = false;
    try {
      const storageRef = ref(storage, `profile-pictures/${user.uid}/${file.name}`);
      console.log("[ProfileUpload] Storage reference created:", storageRef.fullPath);
      
      const uploadResult = await uploadBytes(storageRef, file);
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
      setPreview(null);
      form.reset();
      success = true;

    } catch (error: any) {
      console.error("[ProfileUpload] Full error object:", error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Could not upload profile picture. Check console for details.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      console.log(`[ProfileUpload] Upload process finished. Success: ${success}`);
      if (success) {
        await refetchUserProfile();
      }
    }
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
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24 border-4 border-primary/50">
                    <AvatarImage src={preview || userProfile.photoURL || undefined} alt={userProfile.displayName || ''} data-ai-hint="avatar person" />
                    <AvatarFallback className="text-3xl">{avatarPlaceholder}</AvatarFallback>
                </Avatar>
                <div className="w-full">
                     <FormField
                      control={form.control}
                      name="profileImage"
                      render={() => (
                        <FormItem>
                          <FormLabel>New Profile Image</FormLabel>
                          <FormControl>
                            <Input 
                              type="file" 
                              accept="image/jpeg,image/png,image/heic,image/heif"
                              onChange={handleFileChange}
                              disabled={isUploading}
                              className="file:text-primary file:font-semibold"
                            />
                          </FormControl>
                           <FormDescription>Max 5MB. Supports JPG, PNG, HEIC.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
            </div>
          </CardContent>
          <CardFooter>
             <Button type="submit" disabled={isUploading || !form.formState.isValid}>
              {isUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {isUploading ? 'Uploading...' : 'Upload & Save'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
