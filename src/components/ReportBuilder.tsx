import React, { useEffect, useState } from 'react';
import { View, Alert } from 'react-native';
import { Card, Text, Button, SegmentedButtons, Checkbox, Divider, Chip, TextInput } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths, startOfYear, subYears } from 'date-fns';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useAppTheme } from '../theme';
import { Job } from '../types';
import { defaultReportOptions, ReportOptions, reportRows, monthRanges, money, metricLabel, selectReportJobs, reportAmount } from '../utils/reportBuilder';
import { nameExportedPdf } from '../utils/exportFileName';

type Props = { jobs: Job[]; owner: boolean; rate: number; userId?: string; mode: 'reports' | 'analytics' };
type Template = { name: string; options: ReportOptions; split?: boolean };
const escapeHtml = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const csvCell = (s: string | number) => '"' + String(s).replace(/"/g,'""') + '"';
const csvLabel = (s:string) => /^[=+\-@\t\r]/.test(s) ? "'"+s : s;

export default function ReportBuilder({jobs, owner, rate, userId, mode}: Props) {
  const { colors: C } = useAppTheme();
  const now = new Date();
  const [start, setStart] = useState(startOfMonth(now));
  const [end, setEnd] = useState(endOfMonth(now));
  const [picker, setPicker] = useState<'start'|'end'|null>(null);
  const [reportOpts, setReportOpts] = useState<ReportOptions>(() => owner ? {...defaultReportOptions, metric:'revenue', scope:'all', direct:'balance'} : {...defaultReportOptions});
  const [analyticsOpts, setAnalyticsOpts] = useState<ReportOptions>(() => ({...defaultReportOptions, metric:owner?'revenue':'earned', scope:'all', direct:'balance'}));
  const opts = mode==='reports'?reportOpts:analyticsOpts;
  const setOpts = mode==='reports'?setReportOpts:setAnalyticsOpts;
  const [split, setSplit] = useState(!owner);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<Template[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [files, setFiles] = useState<{label:string; uri:string}[]>([]);
  const key = 'JT-report-templates-v1-' + (userId || 'local') + '-' + (owner?'owner':'employee');
  useEffect(()=>{ let active=true; setSaved([]); AsyncStorage.getItem(key).then(raw=>{if(active&&raw){try{const v=JSON.parse(raw);if(Array.isArray(v))setSaved(v);}catch{}}}).catch(()=>{});return()=>{active=false};},[key]);
  useEffect(()=>{setFiles([]);},[start,end,reportOpts,split,jobs,owner,rate]);
  const patch = (p:Partial<ReportOptions>) => setOpts(o=>({...o,...p}));
  const valid = startOfDay(start).getTime() <= endOfDay(end).getTime() && (endOfDay(end).getTime()-startOfDay(start).getTime()) <= 3660*86400000;
  const selected = valid ? selectReportJobs(jobs,start,end,opts,owner) : [];
  const ranges = valid && mode==='reports' ? (split ? monthRanges(start,end) : [{start,end,label:format(start,'MMM d, yyyy')+' – '+format(end,'MMM d, yyyy')}]) : [];
  const canExport = valid && ranges.length>0 && (!split || ranges.length<=24);
  const sections = ranges.map(r=>({...r, rows:reportRows(jobs,r.start,r.end,opts,owner,rate)}));
  const label = metricLabel(opts.metric,owner,opts.breakdown);
  const total = reportAmount(selected,opts.metric,owner,rate,opts.breakdown);
  const rangeLabel = format(start,'MMM d, yyyy')+' – '+format(end,'MMM d, yyyy');
  const rowLabel = opts.breakdown==='customer'?'Customer':opts.breakdown==='payment'?'Payment method':opts.breakdown==='pumper'?'Pumper':'Date range';
  const periodName=opts.group==='day'?'Daily':opts.group==='week'?'Weekly':opts.group==='month'?'Monthly':'Yearly';
  const reportTitle=opts.breakdown==='customer'?'Customer Summary':opts.breakdown==='payment'?'Payment Summary':opts.breakdown==='pumper'?'Employee Payroll Report':periodName+(opts.metric==='revenue'?' Revenue Report':' Earnings Report');
  const scopeLabel=opts.scope==='company'?(owner?'Pumper jobs only':'Company jobs only'):opts.scope==='independent'?(owner?'Owner jobs only':'Independent jobs only'):'All jobs';
  const filterText=scopeLabel+' • '+(opts.direct==='exclude'?'Direct-payment jobs excluded':'Direct payments included; deducted for owed')+' • '+(opts.status==='all'?'All payment statuses':opts.status==='paid'?'Paid jobs only':'Unpaid jobs only')+((opts.breakdown||'period')==='period'&&opts.group==='week'?' • Weeks start '+(opts.weekStartsOn===1?'Monday':'Sunday'):'');
  const card = {marginBottom:16, backgroundColor:C.surface};
  const heading = {fontSize:18,fontWeight:'700' as const,color:C.text,marginBottom:10};
  const sub = {color:C.textSecondary,marginBottom:8};
  const space = {marginBottom:12};
  const presets:Template[] = owner ? [
    {name:'Monthly business',options:{...defaultReportOptions,group:'month',metric:'revenue',scope:'all',direct:'balance'}},
    {name:'Employee payroll',options:{...defaultReportOptions,breakdown:'pumper',metric:'owed',scope:'company',direct:'balance'}},
    {name:'Customer summary',options:{...defaultReportOptions,breakdown:'customer',metric:'revenue',scope:'all',direct:'balance'}},
    {name:'Payment summary',options:{...defaultReportOptions,breakdown:'payment',metric:'revenue',scope:'all',direct:'balance'}},
    {name:'Outstanding payments',options:{...defaultReportOptions,group:'week',metric:'revenue',scope:'all',direct:'balance',status:'unpaid'}}
  ] : [
    {name:'Employee income',options:defaultReportOptions,split:true},
    {name:'Employer balance',options:{...defaultReportOptions,direct:'balance'}},
    {name:'Personal earnings',options:{...defaultReportOptions,metric:'earned',scope:'all',direct:'balance'}},
    {name:'Customer summary',options:{...defaultReportOptions,breakdown:'customer',metric:'earned',scope:'company',direct:'balance'}},
    {name:'Payment summary',options:{...defaultReportOptions,breakdown:'payment',metric:'revenue',scope:'company',direct:'balance'}},
    {name:'Outstanding jobs',options:{...defaultReportOptions,metric:'revenue',status:'unpaid',direct:'balance'}}
  ];
  const apply = (t:Template) => {setOpts({...t.options});setTemplateName(t.name);setSplit(t.split??false);};
  async function saveTemplate() {
    const name=templateName.trim() || 'Custom '+(saved.length+1);
    const next=[...saved.filter(t=>t.name!==name),{name,options:{...opts},split}];
    try{await AsyncStorage.setItem(key,JSON.stringify(next));setSaved(next);Alert.alert('Template saved',name);}catch{Alert.alert('Could not save template');}
  }
  async function share(uri:string, mimeType:string) {
    if (!(await Sharing.isAvailableAsync())) {Alert.alert('Sharing unavailable','This device cannot share files.');return;}
    await Sharing.shareAsync(uri,{mimeType});
  }
  async function exportReports(kind:'pdf'|'csv') {
    if (!canExport) {Alert.alert('Check the date range','Choose a valid range of up to 24 months when creating separate files.');return;}
    // Independent data is private: only an explicit personal export can include it.
    if (!owner && opts.scope!=='company') {
      Alert.alert('Private earnings report','This export includes independent jobs. Share it only with your intended recipient.',[{text:'Cancel',style:'cancel'},{text:'Continue',onPress:()=>void generate(kind)}]);
    } else await generate(kind);
  }
  async function generate(kind:'pdf'|'csv') {
    setBusy(true);
    try {
      const made:{label:string;uri:string}[]=[];
      for (const section of sections) {
        const filename='JT-'+opts.metric+'-'+format(section.start,'yyyy-MM-dd')+'-to-'+format(section.end,'yyyy-MM-dd')+'-'+Date.now();
        const sum=reportAmount(selectReportJobs(jobs,section.start,section.end,opts,owner),opts.metric,owner,rate,opts.breakdown);
        let uri:string;
        if(kind==='pdf'){
          const rows=section.rows.map(r=>'<tr><td>'+escapeHtml(r.label)+'</td><td>'+escapeHtml(money(r.amount))+'</td></tr>').join('');
          const html='<html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;padding:30px;color:#17212b}h1{font-size:25px;margin:0 0 8px}p{color:#52606d}table{border-collapse:collapse;width:100%;margin-top:24px}th,td{padding:13px;border-bottom:1px solid #ddd;text-align:left}th{background:#eef1f4}td:last-child,th:last-child{text-align:right}tfoot td{font-weight:bold;border-top:2px solid #555}tr{page-break-inside:avoid}</style></head><body><h1>'+escapeHtml(reportTitle)+'</h1><p>'+escapeHtml(format(section.start,'MMM d, yyyy')+' – '+format(section.end,'MMM d, yyyy'))+'</p><p>'+escapeHtml(filterText)+'</p><table><thead><tr><th>'+escapeHtml(rowLabel)+'</th><th>'+escapeHtml(label)+'</th></tr></thead><tbody>'+rows+'</tbody><tfoot><tr><td>Total</td><td>'+escapeHtml(money(sum))+'</td></tr></tfoot></table></body></html>';
          const printed=await Print.printToFileAsync({html});
          uri=await nameExportedPdf(printed.uri,filename);
        }else{
          const dir=FileSystem.cacheDirectory || FileSystem.documentDirectory;
          if(!dir) throw new Error('No export directory');
          uri=dir+filename+'.csv';
          const lines=[[rowLabel,label,'Jobs','Yards'].map(csvCell).join(','),...section.rows.map(r=>[csvLabel(r.label),r.amount.toFixed(2),r.jobs,r.yards].map(csvCell).join(',')),['Total',sum.toFixed(2),'',''].map(csvCell).join(',')];
          await FileSystem.writeAsStringAsync(uri,lines.join('\r\n'));
        }
        made.push({label:section.label,uri});
      }
      setFiles(made);
      if(made.length===1) await share(made[0].uri,kind==='pdf'?'application/pdf':'text/csv');
      else Alert.alert('Reports ready',made.length+' separate files created. Tap each file below to share or save.');
    }catch(e){console.error(e);Alert.alert('Export failed','Unable to create report.');}finally{setBusy(false);}
  }
  const analysisOptions = {...opts, breakdown:'period' as const, group:'month' as const};
  const analysisRows = valid ? reportRows(jobs,start,end,analysisOptions,owner,rate) : [];
  const priorJobs=valid?selectReportJobs(jobs,subYears(start,1),subYears(end,1),opts,owner):[];
  const priorAmount=reportAmount(priorJobs,opts.metric,owner,rate,opts.breakdown);
  const busiest=analysisRows.reduce<typeof analysisRows[number] | undefined>((best,r)=>!best||r.jobs>best.jobs?r:best,undefined);
  const payrollRows=mode==='analytics'&&owner&&valid&&opts.scope!=='independent'?reportRows(jobs,start,end,{...opts,scope:'company',breakdown:'pumper',metric:'earned'},true,rate):[];
  const customerMap = new Map<string,Job[]>();
  selected.forEach(j=>{const name=j.companyName?.trim()||'No company';customerMap.set(name,[...(customerMap.get(name)||[]),j]);});
  const customers=Array.from(customerMap,([name,js])=>({name,amount:reportAmount(js,opts.metric,owner,rate,opts.breakdown),count:js.length})).sort((a,b)=>b.amount-a.amount);
  const peak=Math.max(1,...analysisRows.map(r=>Math.abs(r.amount)));
  return <View>
    <Card style={card}><Card.Content>
      <Text style={heading}>{mode==='reports'?'Report Builder':'Analytics'}</Text>
      <Text style={sub}>{mode==='reports'?'Choose a template or build a custom report. Preview before exporting.':'Explore earnings and customer performance for your selected dates.'}</Text>
      {mode==='reports'&&<View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:12}}>
        {presets.map(t=><Chip key={t.name} onPress={()=>apply(t)}>{t.name}</Chip>)}
        {saved.map(t=><Chip key={'saved-'+t.name} onPress={()=>apply(t)} icon="bookmark">{t.name}</Chip>)}
      </View>}
      <Text style={heading}>Date range</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:12}}>
        <Chip onPress={()=>{setStart(startOfMonth(now));setEnd(endOfMonth(now));}}>This month</Chip>
        <Chip onPress={()=>{const d=subMonths(now,1);setStart(startOfMonth(d));setEnd(endOfMonth(d));}}>Last month</Chip>
        <Chip onPress={()=>{setStart(startOfYear(now));setEnd(now);}}>This year</Chip>
      </View>
      <View style={{flexDirection:'row',gap:8,marginBottom:12}}>
        <Button style={{flex:1}} mode="outlined" onPress={()=>setPicker('start')}>{format(start,'MMM d, yyyy')}</Button>
        <Button style={{flex:1}} mode="outlined" onPress={()=>setPicker('end')}>{format(end,'MMM d, yyyy')}</Button>
      </View>
      {picker&&<DateTimePicker value={picker==='start'?start:end} mode="date" onChange={(event,date)=>{const target=picker;setPicker(null);if(date&&event.type!=='dismissed'){if(target==='start')setStart(startOfDay(date));else setEnd(endOfDay(date));}}}/>}
      {!valid&&<Text style={{color:C.error,marginBottom:12}}>Choose an end date on or after the start date, within ten years.</Text>}
      <Text style={heading}>Amount to display</Text>
      <SegmentedButtons value={opts.metric} onValueChange={v=>patch({metric:v as ReportOptions['metric']})} buttons={[{value:'owed',label:'Owed'},{value:'earned',label:'Earned'},{value:'revenue',label:'Revenue'}]} style={space}/>
      <Text style={heading}>Job scope</Text>
      <SegmentedButtons value={opts.scope} onValueChange={v=>patch({scope:v as ReportOptions['scope']})} buttons={[{value:'company',label:owner?'Pumper jobs':'Company'},{value:'all',label:'All'},{value:'independent',label:owner?'Owner jobs':'Independent'}]} style={space}/>
      <Text style={heading}>Direct payments</Text>
      <SegmentedButtons value={opts.direct} onValueChange={v=>patch({direct:v as ReportOptions['direct']})} buttons={[{value:'exclude',label:'Exclude jobs'},{value:'balance',label:'Include jobs'}]} style={space}/>
      <Text style={sub}>{opts.direct==='exclude'?'Direct-payment company jobs are left out completely.':'Owed subtracts direct payments from the commission balance; earned does not.'}</Text>
      <Text style={heading}>Payment status</Text>
      <SegmentedButtons value={opts.status} onValueChange={v=>patch({status:v as ReportOptions['status']})} buttons={[{value:'all',label:'All'},{value:'paid',label:'Paid'},{value:'unpaid',label:'Unpaid'}]} style={space}/>
      {mode==='reports'&&<>
        <Text style={heading}>Report breakdown</Text>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:12}}>
          {([{value:'period',label:'Date range'},{value:'customer',label:'Customer'},{value:'payment',label:'Payment method'},...(owner?[{value:'pumper',label:'Pumper'}]:[])] as {value: NonNullable<ReportOptions['breakdown']>;label:string}[]).map(b=><Chip key={b.value} selected={(opts.breakdown||'period')===b.value} onPress={()=>patch({breakdown:b.value})}>{b.label}</Chip>)}
        </View>
        {(opts.breakdown||'period')==='period'&&<>
        <Text style={heading}>Group by</Text>
        <SegmentedButtons value={opts.group} onValueChange={v=>patch({group:v as ReportOptions['group']})} buttons={[{value:'day',label:'Day'},{value:'week',label:'Week'},{value:'month',label:'Month'},{value:'year',label:'Year'}]} style={space}/>
        {opts.group==='week'&&<><Text style={heading}>Week starts on</Text><SegmentedButtons value={String(opts.weekStartsOn??0)} onValueChange={v=>patch({weekStartsOn:v==='1'?1:0})} buttons={[{value:'0',label:'Sunday'},{value:'1',label:'Monday'}]} style={space}/></>}
        </>}
        <Checkbox.Item label="Separate file for each month" status={split?'checked':'unchecked'} onPress={()=>setSplit(v=>!v)} />
        {split&&ranges.length>24&&<Text style={{color:C.error,marginBottom:8}}>Choose up to 24 months per batch, or turn off separate files.</Text>}
        <TextInput mode="outlined" label="Template name" value={templateName} onChangeText={setTemplateName} style={space} />
        <Button mode="outlined" icon="bookmark-outline" onPress={saveTemplate}>Save report template</Button>
      </>}
    </Card.Content></Card>
    <Card style={card}><Card.Content>
      <Text style={heading}>{mode==='reports'?reportTitle:label}</Text>
      <Text style={sub}>{rangeLabel}</Text><Text style={sub}>{filterText}</Text>
      {mode==='reports'&&<Text style={{color:C.textSecondary,fontWeight:'600',marginBottom:4}}>{label}</Text>}
      <Text style={{fontSize:30,fontWeight:'700',color:C.success,marginBottom:6}}>{money(total)}</Text>
      <Text style={sub}>{selected.length} jobs • {selected.reduce((n,j)=>n+Number(j.yards||0),0).toFixed(1)} yards</Text>
      {mode==='reports'?sections.slice(0,24).map(s=><View key={s.label} style={{marginTop:12}}>
        <Text style={heading}>{s.label}</Text>
        {s.rows.slice(0,120).map((r,i)=><View key={r.label+i} style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12,paddingVertical:10,borderBottomWidth:1,borderColor:C.border}}>
          <Text style={{flex:1,color:C.text}}>{r.label}</Text><Text style={{fontWeight:'700',color:C.text}}>{money(r.amount)}</Text>
        </View>)}
        {s.rows.length>120&&<Text style={sub}>Showing 120 of {s.rows.length} rows. Export includes all rows.</Text>}
        <Text style={{textAlign:'right',fontWeight:'700',marginTop:8,color:C.success}}>Total {money(reportAmount(selectReportJobs(jobs,s.start,s.end,opts,owner),opts.metric,owner,rate,opts.breakdown))}</Text>
      </View>):<>
        <Text style={heading}>Monthly trend</Text>
        {analysisRows.map(r=><View key={r.label} style={{marginBottom:10}}><View style={{flexDirection:'row',justifyContent:'space-between'}}><Text style={{color:C.text}}>{format(r.start,'MMM yyyy')}</Text><Text style={{color:C.text}}>{money(r.amount)}</Text></View><View style={{height:8,backgroundColor:C.surfaceDark,borderRadius:4,marginTop:5}}><View style={{height:8,width:(Math.abs(r.amount)/peak*100)+'%' as any,backgroundColor:r.amount<0?C.error:C.primary,borderRadius:4}}/></View></View>)}
        <Divider style={{marginVertical:12}}/><Text style={heading}>Top customers</Text>
        {customers.slice(0,10).map(c=><View key={c.name} style={{flexDirection:'row',justifyContent:'space-between',gap:8,paddingVertical:8}}><Text style={{flex:1,color:C.text}}>{c.name} · {c.count} jobs</Text><Text style={{color:C.text,fontWeight:'700'}}>{money(c.amount)}</Text></View>)}
        <Divider style={{marginVertical:12}}/><Text style={heading}>Year-over-year comparison</Text><Text style={sub}>{priorJobs.length?'Same date range last year: '+money(priorAmount):'No matching jobs in the same date range last year.'}</Text>{priorJobs.length>0&&<Text style={sub}>Change: {money(total-priorAmount)}</Text>}
        {!owner&&<><Text style={heading}>Employee earnings</Text><Text style={sub}>Earned: {money(reportAmount(selected,'earned',false,rate))}</Text><Text style={sub}>Owed: {money(reportAmount(selected,'owed',false,rate))}</Text></>}
        {owner&&payrollRows.length>0&&<><Text style={heading}>Pumper earnings</Text>{payrollRows.map((r,i)=><View key={r.label+i} style={{flexDirection:'row',justifyContent:'space-between',paddingVertical:8}}><Text style={{color:C.text}}>{r.label}</Text><Text style={{color:C.text}}>{money(r.amount)}</Text></View>)}</>}
        <Divider style={{marginVertical:12}}/><Text style={heading}>Performance</Text>{busiest&&busiest.jobs>0&&<Text style={sub}>Busiest month: {format(busiest.start,'MMM yyyy')} ({busiest.jobs} jobs)</Text>}<Text style={sub}>Average per job: {money(selected.length?total/selected.length:0)}</Text><Text style={sub}>Average per yard: {money(selected.reduce((n,j)=>n+Number(j.yards||0),0)?total/selected.reduce((n,j)=>n+Number(j.yards||0),0):0)}</Text>
      </>}
    </Card.Content></Card>
    {mode==='reports'&&<><Button mode="contained" icon="file-pdf-box" disabled={!canExport||busy} loading={busy} onPress={()=>exportReports('pdf')} style={{marginBottom:10}}>Export PDF</Button><Button mode="outlined" icon="file-delimited-outline" disabled={!canExport||busy} onPress={()=>exportReports('csv')} style={{marginBottom:12}}>Export CSV (spreadsheet)</Button>
      {files.map(f=><Button key={f.uri} mode="outlined" icon="share-variant" onPress={()=>share(f.uri,f.uri.endsWith('.pdf')?'application/pdf':'text/csv')} style={{marginBottom:8}}>Share {f.label}</Button>)}</>}
  </View>;
}
