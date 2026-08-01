import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OidcVerifierService } from './oidc-verifier.service';

@Module({
  imports: [
    // Les comptes vivent en base depuis la migration 003 : l'authentification
    // ne peut plus se contenter d'un tableau en mémoire.
    DatabaseModule,
    // `POST /auth/session` était ouvert au bruteforce, sur quatre emails connus
    // et un code MFA à six chiffres. 10 tentatives par minute et par IP laissent
    // passer un utilisateur qui se trompe, pas un automate.
  ],
  providers: [AuthService, OidcVerifierService],
  controllers: [AuthController],
  exports: [AuthService, OidcVerifierService]
})
export class AuthModule {}
