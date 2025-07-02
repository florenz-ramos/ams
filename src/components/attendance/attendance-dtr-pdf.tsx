import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: 'Helvetica' },
  title: { textAlign: 'center', fontWeight: 'bold', fontSize: 18, marginBottom: 16, marginTop: 8, letterSpacing: 1 },
  section: { marginBottom: 12 },
  table: {
    display: 'flex',
    flexDirection: 'column',
    width: 297,
    border: '2px solid #000',
    marginBottom: 12,
  },
  tableRow: { flexDirection: 'row' },
  tableHeader: { 
    flexDirection: 'row', 
    backgroundColor: '#eee', 
    fontWeight: 'bold' 
  },
  tableCell: { border: '1px solid #000', padding: 3, textAlign: 'center', fontSize: 8 },
  tableCellHeader: {
    border: '1px solid #000',
    padding: 3,
    textAlign: 'center',
    fontWeight: 'bold',
    backgroundColor: '#eee',
    fontSize: 8,
  },
  headerCell: {
    padding: 3,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 8,
    borderRightColor: '#000',
    borderRightWidth: 1,
  },
  dayCol: { width: 22 },
  timeCol: { width: 36 },
  undertimeCol: { width: 65 },
  small: { fontSize: 8, textAlign: 'justify' },
  signature: { marginTop: 32, fontSize: 10 },
});

export function AttendanceDTRPdf({ name, month, year, attendanceData }: {
  name: string;
  month: string;
  year: string;
  attendanceData: {
    [day: number]: {
      amArrival?: string;
      amDeparture?: string;
      pmArrival?: string;
      pmDeparture?: string;
      undertimeHours?: string;
      undertimeMinutes?: string;
    }
  }
}) {
  const daysInMonth = new Date(Number(year), Number(month), 0).getDate();
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>DAILY TIME RECORD</Text>
        <View style={styles.section}>
          <Text>Name: {name}</Text>
          <Text>Month: {month}/{year}</Text>
        </View>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={[styles.headerCell, styles.dayCol, { justifyContent: 'center' }]}>
              <Text>Day</Text>
            </View>

            <View style={{ flexDirection: 'column', borderRightColor: '#000', borderRightWidth: 1 }}>
              <View style={{ flexDirection: 'row' }}>
                <Text style={[styles.headerCell, { width: 72, borderBottomColor: '#000', borderBottomWidth: 1 }]}>A.M.</Text>
                <Text style={[styles.headerCell, { width: 72, borderBottomColor: '#000', borderBottomWidth: 1, borderRightWidth: 0 }]}>P.M.</Text>
              </View>
              <View style={{ flexDirection: 'row' }}>
                <Text style={[styles.headerCell, styles.timeCol]}>Arrival</Text>
                <Text style={[styles.headerCell, styles.timeCol]}>Departure</Text>
                <Text style={[styles.headerCell, styles.timeCol]}>Arrival</Text>
                <Text style={[styles.headerCell, styles.timeCol, { borderRightWidth: 0 }]}>Departure</Text>
              </View>
            </View>
            
            <View style={{ flexDirection: 'column', borderRightColor: '#000', borderRightWidth: 1 }}>
              <View style={{ flexDirection: 'row' }}>
                <Text style={[styles.headerCell, { width: 130, borderBottomColor: '#000', borderBottomWidth: 1, borderRightWidth: 0 }]}>Undertime</Text>
              </View>
              <View style={{ flexDirection: 'row' }}>
                <Text style={[styles.headerCell, styles.undertimeCol]}>Hours</Text>
                <Text style={[styles.headerCell, styles.undertimeCol, { borderRightWidth: 0 }]}>Minutes</Text>
              </View>
            </View>
          </View>

          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const rec = attendanceData[day] || {};
            return (
              <View style={styles.tableRow} key={day}>
                <Text style={[styles.tableCell, styles.dayCol]}>{day}</Text>
                <Text style={[styles.tableCell, styles.timeCol]}>{rec.amArrival || ''}</Text>
                <Text style={[styles.tableCell, styles.timeCol]}>{rec.amDeparture || ''}</Text>
                <Text style={[styles.tableCell, styles.timeCol]}>{rec.pmArrival || ''}</Text>
                <Text style={[styles.tableCell, styles.timeCol]}>{rec.pmDeparture || ''}</Text>
                <Text style={[styles.tableCell, styles.undertimeCol]}>{rec.undertimeHours || ''}</Text>
                <Text style={[styles.tableCell, styles.undertimeCol, { borderRightWidth: 0 }]}>{rec.undertimeMinutes || ''}</Text>
              </View>
            );
          })}
        </View>
        <Text style={[styles.small, { marginTop: 16 }]}>I certify on my honor that the above is a true and correct report of the hours of work performed, record of which was made daily at the time of arrival and departure from office.</Text>
        <Text style={styles.signature}>In Charge: ___________________________</Text>
      </Page>
    </Document>
  );
} 