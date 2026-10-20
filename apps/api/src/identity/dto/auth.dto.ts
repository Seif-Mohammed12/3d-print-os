import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  fullName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  tenantName!: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  tenantSlug!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  shopName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  shopCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  defaultCurrency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;

  @IsOptional()
  @IsString()
  tenantSlug?: string;
}

export class RefreshDto {
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}

export class LogoutDto {
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}

export class InviteMemberDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  fullName!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsArray()
  @IsString({ each: true })
  roleCodes!: string[];
}

export class UpdateMemberDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleCodes?: string[];

  @IsOptional()
  @IsString()
  status?: 'active' | 'disabled' | 'invited';
}

export class CustomerRegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  fullName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  companyName?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(63)
  tenantSlug!: string;
}
