export type Barbero = {
  id: number;
  nombre: string;
  especialidad: string;
  iniciales: string;
  horarios: string[];
};

export const BARBEROS: Barbero[] = [
  {
    id: 1,
    nombre: "Alonso Lobo",
    especialidad: "Owner & Master Barber",
    iniciales: "AL",
    horarios: [
      "8:30 AM", "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM",
      "1:00 PM", "1:30 PM", "2:00 PM", "3:00 PM", "3:30 PM",
      "4:30 PM", "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM",
    ],
  },
  {
    id: 2,
    nombre: "Ian Bustos Navarrete",
    especialidad: "Cortes modernos y atención al cliente",
    iniciales: "IB",
    horarios: [
      "1:00 PM", "2:00 PM", "3:00 PM", "4:30 PM", "5:30 PM", "6:30 PM",
    ],
  },
];

export function getBarbero(id: number) {
  return BARBEROS.find((b) => b.id === id);
}

export function getHorariosBarbero(id: number) {
  return getBarbero(id)?.horarios ?? [];
}
