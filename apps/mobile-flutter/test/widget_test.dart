import 'package:buildflow_mobile/main.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('App loads create screen', (tester) async {
    await tester.pumpWidget(const BuildFlowMobileApp());

    expect(find.text('Nouvelle NCR'), findsOneWidget);
    expect(find.text('MODE HORS-LIGNE'), findsOneWidget);
  });
}
