import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import api from '../../utils/api';

const forgotPasswordSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

const ForgotPassword = () => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    try {
      setError('');
      setSuccess('');
      // We expect the backend to return a simulated token in Dev mode
      const res = await api.post('/auth/forgot-password', data);
      setSuccess(res.data.message);
      
      // Auto-redirect or show link for testing only
      if (res.data._simulatedToken) {
        setSuccess(`En desarrollo: Simulando envío al correo ${data.email}. Usa este enlace para probar: /reset-password?token=${res.data._simulatedToken}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error procesando la solicitud. Por favor intenta de nuevo.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-extrabold text-primary">Control de Finanzas</h1>
        <h2 className="mt-4 text-center text-2xl font-bold text-slate-900">
          Recuperar Contraseña
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          ¿Recordaste tu contraseña?{' '}
          <Link to="/login" className="font-medium text-primary hover:text-primary-dark">
            Vuelve a iniciar sesión
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 bg-red-50 p-4 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}
          {success && (
             <div className="mb-4 bg-emerald-50 p-4 rounded-md text-emerald-700 text-sm font-medium break-all">
               {success}
               {success.includes('/reset-password?token') && (
                 <div className="mt-3">
                   <Link to={success.split(': ')[2]} className="bg-emerald-600 text-white px-3 py-1.5 rounded-md text-sm font-bold shadow-sm inline-block hover:bg-emerald-700">Ir a Restablecer</Link>
                 </div>
               )}
             </div>
          )}
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Correo electrónico registrado
              </label>
              <div className="mt-1">
                <input
                  {...register('email')}
                  type="email"
                  placeholder="tu@correo.com"
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Enviando...' : 'Enviar enlace de recuperación'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
