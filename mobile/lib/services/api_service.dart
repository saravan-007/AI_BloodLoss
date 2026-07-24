import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  late final Dio dio;

  // Render backend URL (with fallback to local environment if needed)
  final String baseUrl = 'https://ai-bloodloss.onrender.com/api';

  factory ApiService() {
    return _instance;
  }

  ApiService._internal() {
    dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      headers: {
        'Content-Type': 'application/json',
      },
    ));

    // Request interceptor to attach JWT Authorization headers dynamically
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final prefs = await SharedPreferences.getInstance();
        final token = prefs.getString('token');
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (DioException error, handler) async {
        // Handle 401 Unauthorized globally
        if (error.response?.statusCode == 401 && 
            !(error.requestOptions.path.contains('/auth/'))) {
          final prefs = await SharedPreferences.getInstance();
          await prefs.remove('token');
          await prefs.remove('role');
          await prefs.remove('user_data');
          // In Flutter we broadcast logouts or handle route pushes in global state context
        }
        return handler.next(error);
      },
    ));
  }
}
