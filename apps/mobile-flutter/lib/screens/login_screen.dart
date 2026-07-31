import 'package:flutter/material.dart';
import '../services/auth_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

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
        mfaCode: _mfaController.text.trim()
      );
      if (!mounted) return;
      Navigator.of(context).pushReplacementNamed('/create');
    } on AuthException catch (err) {
      if (!mounted) return;
      setState(() {
        // Premier appel sans code : le serveur réclame le second facteur.
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
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Icon(Icons.shield_outlined, size: 56, color: Color(0xFF1F7DFF)),
                const SizedBox(height: 16),
                const Text(
                  'BuildFlow',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold)
                ),
                const SizedBox(height: 4),
                const Text(
                  'Qualité & Sécurité chantier',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white70)
                ),
                const SizedBox(height: 32),
                TextField(
                  key: const Key('login-email'),
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  autocorrect: false,
                  decoration: const InputDecoration(
                    labelText: 'Email',
                    border: OutlineInputBorder()
                  )
                ),
                const SizedBox(height: 16),
                TextField(
                  key: const Key('login-password'),
                  controller: _passwordController,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'Mot de passe',
                    border: OutlineInputBorder()
                  )
                ),
                if (_mfaRequired) ...[
                  const SizedBox(height: 16),
                  TextField(
                    key: const Key('login-mfa'),
                    controller: _mfaController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Code MFA',
                      border: OutlineInputBorder()
                    )
                  )
                ],
                if (_error != null) ...[
                  const SizedBox(height: 16),
                  Text(
                    _error!,
                    key: const Key('login-error'),
                    style: const TextStyle(color: Color(0xFFE5484D))
                  )
                ],
                const SizedBox(height: 24),
                FilledButton(
                  key: const Key('login-submit'),
                  onPressed: _submitting ? null : _submit,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: _submitting
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2)
                          )
                        : const Text('Se connecter')
                  )
                )
              ]
            )
          )
        )
      )
    );
  }
}
