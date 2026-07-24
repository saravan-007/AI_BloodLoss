import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../../services/api_service.dart';

class PatientDetailScreen extends StatefulWidget {
  const PatientDetailScreen({Key? key}) : super(key: key);

  @override
  State<PatientDetailScreen> createState() => _PatientDetailScreenState();
}

class _PatientDetailScreenState extends State<PatientDetailScreen> {
  late dynamic _patient;
  List<dynamic> _surgeries = [];
  List<dynamic> _notes = [];
  bool _isLoading = true;
  final _noteController = TextEditingController();

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _patient = ModalRoute.of(context)!.settings.arguments;
    _fetchDetails();
  }

  Future<void> _fetchDetails() async {
    setState(() => _isLoading = true);
    try {
      final pId = _patient['_id'];
      final surgRes = await ApiService().dio.get('/surgeries/patient/$pId');
      final notesRes = await ApiService().dio.get('/patient-notes/$pId');
      
      setState(() {
        _surgeries = surgRes.data;
        _notes = notesRes.data;
      });
    } catch (e) {
      // Mock local fallback
      setState(() {
        _surgeries = [
          {
            '_id': 's_mock_1',
            'surgeryType': _patient['surgeryType'] ?? 'Surgical Bypass',
            'surgeryDate': DateTime.now().subtract(const Duration(days: 2)).toIso8601String(),
            'totalBloodLoss': 350.0,
            'totalFluidLoss': 820.0,
            'surgeryDuration': 2.5,
            'status': 'Completed',
            'aiAnalysis': '{"overallRiskLevel":"Low","summary":"The patient underwent stable coronary revascularization with low overall blood loss. Baseline parameters remain fully conserved.","aiRecommendations":["Maintain standard maintenance IV saline","Monitor blood pressure hourly"],"aiPrecautions":["Ensure normal body temp is maintained"],"aiRisks":["Mild tissue dehydration"],"aiSuggestedMedication":["Prophylactic antibiotics IV"],"aiMonitoringAdvice":["Hemodynamics ECG monitoring"],"aiFollowUpSuggestions":["Check hemoglobin counts in PACU"]}',
          }
        ];
        _notes = [
          {
            'noteText': 'Post-op vitals stabilized immediately. Discharged to ICU for baseline monitoring.',
            'createdAt': DateTime.now().subtract(const Duration(days: 1)).toIso8601String(),
          }
        ];
      });
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _addNote() async {
    final text = _noteController.text.trim();
    if (text.isEmpty) return;

    try {
      final response = await ApiService().dio.post('/patient-notes', data: {
        'patientId': _patient['_id'],
        'noteText': text,
      });

      if (response.statusCode == 201) {
        setState(() {
          _notes.insert(0, response.data);
          _noteController.clear();
        });
        Fluttertoast.showToast(msg: 'Note saved successfully');
      }
    } catch (e) {
      // Mock save note
      setState(() {
        _notes.insert(0, {
          'noteText': text,
          'createdAt': DateTime.now().toIso8601String(),
        });
        _noteController.clear();
      });
      Fluttertoast.showToast(msg: 'Note saved locally (Demo)');
    }
  }

  Future<void> _printPdfReport(dynamic surgery) async {
    final pdf = pw.Document();
    
    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        build: (pw.Context context) {
          return pw.Padding(
            padding: const pw.EdgeInsets.all(24),
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.Header(level: 0, text: 'Clinical Surgery & Fluid Report'),
                pw.SizedBox(height: 12),
                pw.Text('Patient Name: ${_patient['patientName']}'),
                pw.Text('Age: ${_patient['age']} | Gender: ${_patient['gender']}'),
                pw.Text('Surgery: ${surgery['surgeryType']}'),
                pw.Text('Date: ${surgery['surgeryDate'].toString().substring(0, 10)}'),
                pw.Divider(),
                pw.SizedBox(height: 12),
                pw.Bullet(text: 'Estimated Blood Loss: ${surgery['totalBloodLoss']} ml'),
                pw.Bullet(text: 'Estimated Fluid Loss: ${surgery['totalFluidLoss']} ml'),
                pw.Bullet(text: 'Surgery Duration: ${surgery['surgeryDuration']} hours'),
                pw.SizedBox(height: 24),
                pw.Text('Report compiled via AI Blood Loss Estimator System.', style: const pw.TextStyle(fontSize: 8)),
              ],
            ),
          );
        },
      ),
    );

    await Printing.layoutPdf(onLayout: (PdfPageFormat format) async => pdf.save());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_patient['patientName']),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Patient info banner
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('PATIENT DOSSIER', style: TextStyle(color: Colors.grey[500], fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
                          const SizedBox(height: 8),
                          Text('Age/Gender: ${_patient['age']} y/o • ${_patient['gender']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                          Text('Weight: ${_patient['weight']} kg | Blood Group: ${_patient['bloodGroup']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                          if (_patient['allergies'] != null && _patient['allergies'] != 'None') ...[
                            const SizedBox(height: 8),
                            Text('Allergies: ${_patient['allergies']}', style: const TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold)),
                          ],
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Surgeries List
                  const Text('Surgery Log & Parameters', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  if (_surgeries.isEmpty)
                    const Card(child: Padding(padding: EdgeInsets.all(16), child: Text('No surgeries logged for this patient.'))),
                  ..._surgeries.map((surg) {
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(surg['surgeryType'] ?? 'Procedure', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                                Text(surg['surgeryDate']?.toString()?.substring(0, 10) ?? '', style: const TextStyle(color: Colors.grey, fontSize: 11)),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('Blood Loss: ${surg['totalBloodLoss']} ml', style: const TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold)),
                                Text('Fluid Loss: ${surg['totalFluidLoss']} ml', style: const TextStyle(color: Colors.amber, fontWeight: FontWeight.bold)),
                                Text('Duration: ${surg['surgeryDuration']} hrs'),
                              ],
                            ),
                            const SizedBox(height: 16),
                            ElevatedButton.icon(
                              onPressed: () => _printPdfReport(surg),
                              icon: const Icon(Icons.print_rounded, size: 18),
                              label: const Text('Print PDF Report', style: TextStyle(fontWeight: FontWeight.bold)),
                              style: ElevatedButton.styleFrom(backgroundColor: Colors.blue[800]),
                            ),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                  const SizedBox(height: 20),

                  // Clinical Notes
                  const Text('Clinical Notes', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(12.0),
                      child: Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _noteController,
                              decoration: const InputDecoration(
                                hintText: 'Add postoperative recovery note...',
                                border: InputBorder.none,
                              ),
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.send_rounded, color: Colors.blue),
                            onPressed: _addNote,
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  ..._notes.map((note) {
                    return ListTile(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 4),
                      title: Text(note['noteText'] ?? ''),
                      subtitle: Text(note['createdAt']?.toString()?.substring(0, 16)?.replaceFirst('T', ' ') ?? ''),
                      leading: const Icon(Icons.notes_rounded),
                    );
                  }).toList(),
                ],
              ),
            ),
    );
  }
}
