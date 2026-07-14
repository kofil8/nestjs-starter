import { IsNotEmpty, IsString, IsStrongPassword, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Reset token is required' })
  token!: string;

  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  @IsStrongPassword()
  password!: string;
}
