import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useTheme } from '../context/ThemeContext';

const LogPreview = ({ log }: { log: any }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const textColor = isDark ? 'text-white' : 'text-gray-800';
  const subTextColor = isDark ? 'text-gray-400' : 'text-gray-600';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';

  const attendance = useLiveQuery(() => db.attendance.where('dailyLogId').equals(log.id).toArray()) || [];
  const project = useLiveQuery(() => db.projects.get(Number(log.projectId)));

  const presentCount = attendance.filter(a => a.status === 'Presente').length;
  const absentCount = attendance.filter(a => a.status === 'Falta').length;

  return (
    <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className={`block text-xs font-bold uppercase tracking-wider ${subTextColor} mb-1`}>Obra</label>
                <p className={`${textColor} font-medium`}>{project?.name || 'Cargando...'}</p>
            </div>
            <div>
                <label className={`block text-xs font-bold uppercase tracking-wider ${subTextColor} mb-1`}>Clima</label>
                <p className={`${textColor}`}>{log.weather}</p>
            </div>
        </div>

        <div>
            <label className={`block text-xs font-bold uppercase tracking-wider ${subTextColor} mb-2`}>Actividades</label>
            <div className={`p-3 rounded-lg border ${borderColor} ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <p className={`${textColor} whitespace-pre-wrap`}>{log.activities}</p>
            </div>
        </div>

        {log.incidents && (
            <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-red-500 mb-2">Incidentes</label>
                <div className={`p-3 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20`}>
                    <p className="text-red-700 dark:text-red-400 whitespace-pre-wrap">{log.incidents}</p>
                </div>
            </div>
        )}

        <div>
            <div className="flex items-center justify-between mb-2">
                <label className={`block text-xs font-bold uppercase tracking-wider ${subTextColor}`}>Asistencia</label>
                <div className="text-xs space-x-2">
                    <span className="text-green-600 font-medium">Presentes: {presentCount}</span>
                    <span className="text-red-600 font-medium">Faltas: {absentCount}</span>
                </div>
            </div>
            <div className={`overflow-hidden rounded-lg border ${borderColor}`}>
                <table className="w-full text-sm">
                    <thead className={isDark ? 'bg-gray-700' : 'bg-gray-100'}>
                        <tr>
                            <th className={`px-3 py-2 text-left font-medium ${subTextColor}`}>Trabajador</th>
                            <th className={`px-3 py-2 text-left font-medium ${subTextColor}`}>Estado</th>
                            <th className={`px-3 py-2 text-left font-medium ${subTextColor}`}>Notas</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${borderColor}`}>
                        {attendance.map(a => (
                            <tr key={a.id}>
                                <td className={`px-3 py-2 ${textColor}`}>{a.workerName}</td>
                                <td className="px-3 py-2">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium 
                                        ${a.status === 'Presente' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                                          a.status === 'Falta' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 
                                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                                        {a.status}
                                    </span>
                                </td>
                                <td className={`px-3 py-2 ${subTextColor}`}>{a.notes || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {log.usedMaterials && log.usedMaterials.length > 0 && (
            <div>
                <label className={`block text-xs font-bold uppercase tracking-wider ${subTextColor} mb-2`}>Materiales Utilizados</label>
                <div className={`overflow-hidden rounded-lg border ${borderColor}`}>
                    <table className="w-full text-sm">
                        <thead className={isDark ? 'bg-gray-700' : 'bg-gray-100'}>
                            <tr>
                                <th className={`px-3 py-2 text-left font-medium ${subTextColor}`}>Material</th>
                                <th className={`px-3 py-2 text-left font-medium ${subTextColor}`}>Cantidad</th>
                                <th className={`px-3 py-2 text-left font-medium ${subTextColor}`}>Unidad</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${borderColor}`}>
                            {log.usedMaterials.map((m: any, i: number) => (
                                <tr key={i}>
                                    <td className={`px-3 py-2 ${textColor}`}>{m.name}</td>
                                    <td className={`px-3 py-2 ${textColor}`}>{m.quantity}</td>
                                    <td className={`px-3 py-2 ${subTextColor}`}>{m.unit}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {log.photos && log.photos.length > 0 && (
            <div>
                <label className={`block text-xs font-bold uppercase tracking-wider ${subTextColor} mb-2`}>Fotos</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {log.photos.map((photo: string, index: number) => (
                        <img 
                            key={index} 
                            src={photo} 
                            alt={`Foto ${index + 1}`} 
                            className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                        />
                    ))}
                </div>
            </div>
        )}
    </div>
  );
};

export default LogPreview;
