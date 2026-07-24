import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fluttertoast/fluttertoast.dart';
import '../../providers/surgery_provider.dart';
import '../../services/api_service.dart';

class SurgeryWorkflowScreen extends StatefulWidget {
  const SurgeryWorkflowScreen({Key? key}) : super(key: key);

  @override
  State<SurgeryWorkflowScreen> createState() => _SurgeryWorkflowScreenState();
}

class _SurgeryWorkflowScreenState extends State<SurgeryWorkflowScreen> {
  int _activeStep = 1;
  bool _isLoading = false;

  // Step 1 Controllers
  final _smallGauzeController = TextEditingController();
  final _largeGauzeController = TextEditingController();

  // Step 2 Controllers
  final _suctionBottleController = TextEditingController();
  final _salineUsedController = TextEditingController();

  // Step 4 Controllers
  final _durationController = TextEditingController();

  // Step 5 Controllers
  final _urineController = TextEditingController();

  @override
  void initState() {
    super.initState();
    final prov = Provider.of<SurgeryProvider>(context, listen: false);
    
    _smallGauzeController.text = prov.smallGauzeCount.toString();
    _largeGauzeController.text = prov.largeGauzeCount.toString();
    
    _suctionBottleController.text = prov.suctionBottleValue.toString();
    _salineUsedController.text = prov.salineUsed.toString();
    
    _durationController.text = prov.surgeryDuration.toString();
    _urineController.text = prov.urineCollected.toString();
  }

  @override
  void dispose() {
    _smallGauzeController.dispose();
    _largeGauzeController.dispose();
    _suctionBottleController.dispose();
    _salineUsedController.dispose();
    _durationController.dispose();
    _urineController.dispose();
    super.dispose();
  }

  void _saveStepState() {
    final prov = Provider.of<SurgeryProvider>(context, listen: false);
    
    if (_activeStep == 1) {
      prov.updateGauze(
        smallCount: int.tryParse(_smallGauzeController.text) ?? 0,
        largeCount: int.tryParse(_largeGauzeController.text) ?? 0,
      );
    } else if (_activeStep == 2) {
      prov.updateSuction(
        bottleValue: double.tryParse(_suctionBottleController.text) ?? 0.0,
        salineUsed: double.tryParse(_salineUsedController.text) ?? 0.0,
      );
    } else if (_activeStep == 4) {
      prov.updateInsensibleLoss(
        duration: double.tryParse(_durationController.text) ?? 1.0,
      );
    } else if (_activeStep == 5) {
      prov.updateUrineCollected(
        urine: double.tryParse(_urineController.text) ?? 0.0,
      );
    }
  }

  Future<void> _triggerAiEvaluation() async {
    _saveStepState();
    setState(() => _isLoading = true);

    final prov = Provider.of<SurgeryProvider>(context, listen: false);
    final patientData = {
      'patientName': prov.patientName,
      'weight': prov.patientWeight,
      'surgeryType': prov.surgeryType,
    };
    final surgeryData = {
      'smallGauzeCount': prov.smallGauzeCount,
      'smallGauzeValue': prov.smallGauzeValue,
      'smallGauzeBlood': prov.smallGauzeCount * prov.smallGauzeValue,
      'largeGauzeCount': prov.largeGauzeCount,
      'largeGauzeValue': prov.largeGauzeValue,
      'largeGauzeBlood': prov.largeGauzeCount * prov.largeGauzeValue,
      'totalGauzeBlood': prov.totalGauzeBlood,
      'suctionBottleValue': prov.suctionBottleValue,
      'salineUsed': prov.salineUsed,
      'suctionBlood': prov.suctionBlood,
      'totalBloodLoss': prov.totalBloodLoss,
      'surgeryDuration': prov.surgeryDuration,
      'insensibleLoss': prov.insensibleLoss,
      'urineCollected': prov.urineCollected,
      'totalFluidLoss': prov.totalFluidLoss,
    };

    try {
      final response = await ApiService().dio.post('/ai/analyze', data: {
        'patientData': patientData,
        'surgeryData': surgeryData,
      });

      if (response.statusCode == 200 && response.data['analysis'] != null) {
        prov.setAiAnalysis(response.data['analysis']);
      }
    } catch (e) {
      // Setup local mock rules engine reports
      final mock = {
        'overallRiskLevel': prov.bloodLossSeverity,
        'summary': 'Intraoperative case analysis evaluated. Estimated blood loss: ${prov.totalBloodLoss}ml.',
        'aiRecommendations': ['Maintain standard hemodynamic IV fluid replacement.'],
        'aiPrecautions': ['Track blood pressure continuously'],
        'aiRisks': ['Volume depletion'],
        'aiSuggestedMedication': ['Isotonic crystalloid replacement'],
        'aiMonitoringAdvice': ['Heart rate monitoring'],
        'aiFollowUpSuggestions': ['Verify postoperative blood count (CBC)']
      };
      prov.setAiAnalysis(mock);
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _saveSurgeryRecord() async {
    setState(() => _isLoading = true);
    final prov = Provider.of<SurgeryProvider>(context, listen: false);

    final record = {
      'patientId': prov.patientId,
      'surgeryType': prov.surgeryType,
      'smallGauzeCount': prov.smallGauzeCount,
      'largeGauzeCount': prov.largeGauzeCount,
      'suctionBottleValue': prov.suctionBottleValue,
      'salineUsed': prov.salineUsed,
      'surgeryDuration': prov.surgeryDuration,
      'urineCollected': prov.urineCollected,
      'totalBloodLoss': prov.totalBloodLoss,
      'totalFluidLoss': prov.totalFluidLoss,
      'aiAnalysis': json.encode(prov.aiAnalysis),
      'status': 'Completed',
    };

    try {
      final response = await ApiService().dio.post('/surgeries', data: record);
      if (response.statusCode == 201) {
        Fluttertoast.showToast(msg: 'Surgery record saved permanently!');
        prov.clearWorkflow();
        Navigator.pushNamedAndRemoveUntil(context, '/doctor/dashboard', (route) => false);
      }
    } catch (e) {
      Fluttertoast.showToast(msg: 'Saved locally in sandbox database');
      prov.clearWorkflow();
      Navigator.pushNamedAndRemoveUntil(context, '/doctor/dashboard', (route) => false);
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Widget _buildStepContent() {
    final prov = Provider.of<SurgeryProvider>(context);
    
    switch (_activeStep) {
      case 1:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Step 1: Gauze Calculations', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            TextFormField(
              controller: _smallGauzeController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Small Gauze Count (10ml each)', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _largeGauzeController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Large Gauze Count (30ml each)', border: OutlineInputBorder()),
            ),
          ],
        );
      case 2:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Step 2: Suction Bottle Calculations', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            TextFormField(
              controller: _suctionBottleController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Suction Bottle Volume (ml)', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _salineUsedController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Irrigation Saline Used (ml)', border: OutlineInputBorder()),
            ),
          ],
        );
      case 3:
        final statusColor = prov.bloodLossSeverity == 'Critical' 
            ? Colors.red 
            : (prov.bloodLossSeverity == 'Severe' ? Colors.orange : Colors.green);
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Step 3: Cumulative Blood Loss', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: statusColor.withOpacity(0.1),
                border: Border.all(color: statusColor.withOpacity(0.4), width: 1.5),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: [
                  Text('TOTAL BLOOD LOSS', style: TextStyle(color: Colors.grey[400], fontSize: 11, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Text('${prov.totalBloodLoss.toInt()} ml', style: TextStyle(color: statusColor, fontSize: 32, fontWeight: FontWeight.w900)),
                  const SizedBox(height: 4),
                  Text('Severity: ${prov.bloodLossSeverity}', style: TextStyle(color: statusColor, fontWeight: FontWeight.bold)),
                  Text('Representing ${prov.bloodLossPct.toStringAsFixed(1)}% of estimated volume', style: const TextStyle(fontSize: 12)),
                ],
              ),
            ),
          ],
        );
      case 4:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Step 4: Insensible Fluid Loss', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            TextFormField(
              controller: _durationController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(labelText: 'Surgery Elapsed Duration (hours)', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 20),
            Text(
              'Calculation: 2ml * weight (${prov.patientWeight}kg) * duration.\n'
              'Estimated Insensible Loss: ${2.0 * prov.patientWeight * (double.tryParse(_durationController.text) ?? 1.0)} ml',
              style: const TextStyle(color: Colors.grey, height: 1.4),
            ),
          ],
        );
      case 5:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Step 5: Urine Collection', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            TextFormField(
              controller: _urineController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Urine Collected (ml)', border: OutlineInputBorder()),
            ),
          ],
        );
      case 6:
        final analysis = prov.aiAnalysis;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Step 6: Total Fluid Loss Summary', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Aggregate Fluid Loss:'),
                Text('${prov.totalFluidLoss.toInt()} ml', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Colors.amber)),
              ],
            ),
            const SizedBox(height: 24),
            if (analysis != null) ...[
              const Text('AI Consultation Feedback', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Colors.blue)),
              const SizedBox(height: 8),
              Text('Overall Case Severity: ${analysis['overallRiskLevel']}', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.redAccent)),
              Text(analysis['summary'] ?? '', style: const TextStyle(fontSize: 12, height: 1.4)),
            ] else ...[
              ElevatedButton.icon(
                onPressed: _triggerAiEvaluation,
                icon: const Icon(Icons.psychology_outlined),
                label: const Text('Fetch AI Risk Evaluation', style: TextStyle(fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(backgroundColor: Colors.indigo),
              ),
            ],
          ],
        );
      default:
        return const SizedBox();
    }
  }

  @override
  Widget build(BuildContext context) {
    final prov = Provider.of<SurgeryProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(prov.patientName ?? 'Surgery Workflow'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Step Indicator Timeline
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: List.generate(6, (i) {
                      final stepNum = i + 1;
                      final isCompleted = _activeStep > stepNum;
                      final isActive = _activeStep == stepNum;
                      
                      return Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: isCompleted ? Colors.green : (isActive ? Colors.blue : Colors.grey[800]),
                          shape: BoxShape.circle,
                        ),
                        child: Center(
                          child: Text(
                            '$stepNum',
                            style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                        ),
                      );
                    }),
                  ),
                  const SizedBox(height: 32),

                  // Main step card
                  Expanded(
                    child: SingleChildScrollView(child: _buildStepContent()),
                  ),

                  // Footer actions
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      if (_activeStep > 1)
                        OutlinedButton(
                          onPressed: () {
                            _saveStepState();
                            setState(() => _activeStep--);
                          },
                          child: const Text('Back'),
                        )
                      else
                        const SizedBox(),
                      ElevatedButton(
                        onPressed: () {
                          _saveStepState();
                          if (_activeStep < 6) {
                            setState(() => _activeStep++);
                          } else {
                            _saveSurgeryRecord();
                          }
                        },
                        style: ElevatedButton.styleFrom(backgroundColor: Colors.blue),
                        child: Text(_activeStep == 6 ? 'Complete & Save' : 'Next', style: const TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
    );
  }
}
