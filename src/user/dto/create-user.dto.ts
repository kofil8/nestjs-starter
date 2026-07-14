import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @IsOptional()
  @IsString()
  firstName!: string;

  @IsOptional()
  @IsString()
  lastName!: string;
}
