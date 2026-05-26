import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OidcVerifierService } from './oidc-verifier.service';

@Module({
  providers: [AuthService, OidcVerifierService],
  controllers: [AuthController],
  exports: [AuthService, OidcVerifierService]
})
export class AuthModule {}
