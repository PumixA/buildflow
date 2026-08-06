import 'package:flutter/material.dart';
import '../main.dart';
import '../services/auth_service.dart';

class LoginScreen extends StatefulWidget {
  final VoidCallback? onLoginSuccess;
  const LoginScreen({super.key, this.onLoginSuccess});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController(text: 'chef@buildflow.io');
  final _passwordController = TextEditingController();
  final _mfaController = TextEditingController();

  bool _mfaRequired = false;
  bool _submitting = false;
  String? _error;
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _mfaController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      await AuthService.instance.login(
        _emailController.text.trim(),
        _passwordController.text,
        mfaCode: _mfaController.text.trim(),
      );
      if (!mounted) return;
      widget.onLoginSuccess?.call();
    } on AuthException catch (err) {
      if (!mounted) return;
      setState(() {
        _mfaRequired = _mfaRequired || err.mfaRequired;
        _error = err.mfaRequired ? 'Code MFA requis.' : err.message;
      });
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment.topLeft,
            radius: 2.0,
            colors: [
              Color(0xFF10243F),
              Color(0xFF080F1B),
              Color(0xFF050C15),
            ],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Brand
                  Container(
                    width: 64, height: 64,
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Icon(Icons.shield_outlined, size: 32, color: AppColors.primary),
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    'BuildFlow',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 30, fontWeight: FontWeight.w800, color: Colors.white, letterSpacing: -0.5),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Qualité & Sécurité chantier',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppColors.textSoft, fontSize: 14),
                  ),
                  const SizedBox(height: 36),

                  // Form card
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppColors.panel,
                      border: Border.all(color: AppColors.line),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        if (!_mfaRequired) ...[
                          // Email
                          TextField(
                            key: const Key('login-email'),
                            controller: _emailController,
                            keyboardType: TextInputType.emailAddress,
                            autocorrect: false,
                            decoration: const InputDecoration(
                              labelText: 'Email',
                              prefixIcon: Icon(Icons.email_outlined, size: 18, color: AppColors.textMuted),
                            ),
                          ),
                          const SizedBox(height: 14),
                          // Password with eye toggle
                          TextField(
                            key: const Key('login-password'),
                            controller: _passwordController,
                            obscureText: _obscurePassword,
                            decoration: InputDecoration(
                              labelText: 'Mot de passe',
                              prefixIcon: const Icon(Icons.lock_outlined, size: 18, color: AppColors.textMuted),
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                                  size: 20,
                                  color: AppColors.textMuted,
                                ),
                                onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                              ),
                            ),
                          ),
                        ] else ...[
                          // MFA step
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.1),
                              border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Row(
                              children: [
                                Icon(Icons.shield_outlined, color: AppColors.primary, size: 20),
                                SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    'Authentification à deux facteurs requise',
                                    style: TextStyle(color: AppColors.primary, fontSize: 13, fontWeight: FontWeight.w500),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 14),
                          TextField(
                            key: const Key('login-mfa'),
                            controller: _mfaController,
                            keyboardType: TextInputType.number,
                            maxLength: 6,
                            decoration: const InputDecoration(
                              labelText: 'Code MFA',
                              prefixIcon: Icon(Icons.pin_outlined, size: 18, color: AppColors.textMuted),
                              hintText: '123456',
                              counterText: '',
                            ),
                          ),
                        ],
                        if (_error != null) ...[
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: AppColors.critical.withValues(alpha: 0.12),
                              border: Border.all(color: AppColors.critical.withValues(alpha: 0.45)),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(_error!, style: const TextStyle(color: Color(0xFFFCA5A5), fontSize: 13)),
                          ),
                        ],
                        const SizedBox(height: 20),
                        // Submit
                        SizedBox(
                          height: 44,
                          child: FilledButton(
                            key: const Key('login-submit'),
                            onPressed: _submitting ? null : _submit,
                            style: FilledButton.styleFrom(
                              backgroundColor: _mfaRequired ? AppColors.primary : AppColors.buttonBg,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                                side: BorderSide(color: _mfaRequired ? AppColors.primary : AppColors.lineFocus),
                              ),
                            ),
                            child: _submitting
                                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                : Text(
                                    _mfaRequired ? 'Vérifier le code' : 'Se connecter',
                                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                                  ),
                          ),
                        ),
                        if (_mfaRequired) ...[
                          const SizedBox(height: 10),
                          TextButton(
                            onPressed: () => setState(() { _mfaRequired = false; _error = null; }),
                            child: const Text('← Retour', style: TextStyle(color: AppColors.textMuted)),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
