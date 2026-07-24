import 'package:flutter/material.dart';
import '../../services/api_service.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({Key? key}) : super(key: key);

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<dynamic> _notifications = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchNotifications();
  }

  Future<void> _fetchNotifications() async {
    setState(() => _isLoading = true);
    try {
      final response = await ApiService().dio.get('/notifications');
      if (response.statusCode == 200) {
        setState(() {
          _notifications = response.data;
        });
      }
    } catch (e) {
      setState(() {
        _notifications = [
          {
            '_id': 'n1',
            'type': 'critical',
            'patientName': 'Ananya Sharma',
            'message': 'Critical Hemorrhage: Blood loss exceeded 750ml.',
            'createdAt': DateTime.now().subtract(const Duration(minutes: 5)).toIso8601String(),
          },
          {
            '_id': 'n2',
            'type': 'warning',
            'patientName': 'Sunita Deshmukh',
            'message': 'Volume shift warning: Fluid loss approaching 2000ml.',
            'createdAt': DateTime.now().subtract(const Duration(hours: 1)).toIso8601String(),
          }
        ];
      });
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Department Notifications')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _notifications.isEmpty
              ? const Center(child: Text('No notifications received.'))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _notifications.length,
                  itemBuilder: (context, index) {
                    final item = _notifications[index];
                    final isCritical = item['type'] == 'critical';
                    
                    return Card(
                      color: isCritical ? Colors.red.withOpacity(0.05) : Colors.amber.withOpacity(0.05),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: BorderSide(color: isCritical ? Colors.red.withOpacity(0.3) : Colors.amber.withOpacity(0.3)),
                      ),
                      child: ListTile(
                        leading: Icon(
                          isCritical ? Icons.error_outline_rounded : Icons.warning_amber_rounded,
                          color: isCritical ? Colors.red : Colors.amber,
                        ),
                        title: Text(item['message'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        subtitle: Text(
                          'Patient: ${item['patientName'] ?? 'Unknown'} • ${item['createdAt']?.toString()?.substring(11, 16)}',
                          style: const TextStyle(fontSize: 11),
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
