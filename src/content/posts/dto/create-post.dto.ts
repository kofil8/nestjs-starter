import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty({ message: 'The title is required!' })
  @MinLength(5, { message: 'Title length must be at least 5 characters' })
  @MaxLength(50, { message: 'Title must be under 50 characters' })
  title!: string;

  @IsString()
  @IsNotEmpty({ message: 'The content is required!' })
  content!: string;

  // authorId is set automatically from the authenticated user
  authorId!: string;
}
