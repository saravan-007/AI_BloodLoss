import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import '../../services/api_service.dart';

class AiChatbotSheet extends StatefulWidget {
  final Map<String, dynamic> patientData;
  final Map<String, dynamic> surgeryData;

  const AiChatbotSheet({
    Key? key,
    required this.patientData,
    required this.surgeryData,
  }) : super(key: key);

  @override
  State<AiChatbotSheet> createState() => _AiChatbotSheetState();
}

class _AiChatbotSheetState extends State<AiChatbotSheet> {
  final _messageController = TextEditingController();
  final List<Map<String, String>> _messages = [];
  bool _isLoading = false;
  String? _rawReport;

  // Predefined quick consultation queries
  final List<String> _quickQuestions = [
    'What IV fluid should be used?',
    'Explain Hypovolemia risks',
    'Postoperative care checklist',
    'Is renal failure possible?'
  ];

  @override
  void initState() {
    super.initState();
    _messages.add({
      'role': 'system',
      'content': 'Hi! I am your AI Surgical Assistant. Ask me anything about this patient\'s metrics.'
    });
    _runInitialAnalysis();
  }

  Future<void> _runInitialAnalysis() async {
    setState(() => _isLoading = true);
    try {
      final response = await ApiService().dio.post('/ai/analyze', data: {
        'patientData': widget.patientData,
        'surgeryData': widget.surgeryData,
      });

      if (response.statusCode == 200 && response.data != null) {
        final analysis = response.data['analysis'];
        final rawText = response.data['rawText'];
        
        setState(() {
          if (analysis != null) {
            _rawReport = analysis['summary'] ?? 'Case evaluated.';
            _messages.add({
              'role': 'assistant',
              'content': 'INITIAL CLINICAL EVALUATION:\n\n'
                  'Overall Risk: ${analysis['overallRiskLevel']}\n\n'
                  'Summary: ${analysis['summary']}\n\n'
                  'Analysis: ${analysis['aiAnalysis']}'
            });
          } else if (rawText != null) {
            _messages.add({'role': 'assistant', 'content': rawText});
          }
        });
      }
    } catch (e) {
      setState(() {
        _messages.add({
          'role': 'assistant',
          'content': 'Notice: Live AI analysis offline. You can still ask clinical questions.'
        });
      });
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _sendQuery(String query) async {
    if (query.trim().isEmpty || _isLoading) return;

    setState(() {
      _messages.add({'role': 'user', 'content': query});
      _isLoading = true;
    });
    _messageController.clear();

    try {
      final response = await ApiService().dio.post('/ai/analyze', data: {
        'patientData': widget.patientData,
        'surgeryData': widget.surgeryData,
        'question': query,
      });

      if (response.statusCode == 200 && response.data != null) {
        setState(() {
          _messages.add({
            'role': 'assistant',
            'content': response.data['answer'] ?? response.data['rawText'] ?? 'No advice compiled.'
          });
        });
      }
    } catch (e) {
      setState(() {
        _messages.add({
          'role': 'assistant',
          'content': 'Error fetching response from medical server. Verify network settings.'
        });
      });
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      maxChildSize: 0.95,
      minChildSize: 0.5,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: Color(0xFF0F172A),
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header indicator
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(color: Colors.grey[700], borderRadius: BorderRadius.circular(2)),
                ),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'AI Clinical Assistant',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900, fontSize: 18),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const Divider(color: Color(0xFF1E293B)),
              
              // Messages timeline
              Expanded(
                child: ListView.builder(
                  controller: scrollController,
                  itemCount: _messages.length,
                  itemBuilder: (context, index) {
                    final msg = _messages[index];
                    final isUser = msg['role'] == 'user';
                    final isSystem = msg['role'] == 'system';

                    return Align(
                      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                      child: Container(
                        margin: const EdgeInsets.symmetric(vertical: 6),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: isUser
                              ? const Color(0xFF3B82F6).withOpacity(0.15)
                              : (isSystem ? Colors.grey[800]?.withOpacity(0.5) : const Color(0xFF1E293B)),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
                        child: Text(
                          msg['content'] ?? '',
                          style: const TextStyle(fontSize: 13, height: 1.4),
                        ),
                      ),
                    );
                  },
                ),
              ),

              if (_isLoading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8.0),
                  child: Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))),
                ),

              // Quick Questions Chips
              if (!_isLoading)
                SizedBox(
                  height: 32,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: _quickQuestions.map((q) {
                      return Padding(
                        padding: const EdgeInsets.only(right: 6.0),
                        child: ActionChip(
                          label: Text(q, style: const TextStyle(fontSize: 11)),
                          onPressed: () => _sendQuery(q),
                          backgroundColor: const Color(0xFF1E293B),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              const SizedBox(height: 12),

              // Input box
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _messageController,
                      style: const TextStyle(fontSize: 14),
                      decoration: InputDecoration(
                        hintText: 'Ask follow-up query...',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      ),
                      onSubmitted: _sendQuery,
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(Icons.send_rounded, color: Colors.blue),
                    onPressed: () => _sendQuery(_messageController.text),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}
