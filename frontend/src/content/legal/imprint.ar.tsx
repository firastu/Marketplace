import { SITE_NAME } from '@/config/site';
import { Mail, Ref, V, type LegalWriter } from '@/components/legal/kit';

/** بيانات الناشر (Impressum) بالعربية. يجب أن تبقى مطابقة لـ imprint.en.tsx. */
const imprint: LegalWriter = (c) => ({
  intro: (
    <p>
      إشعار قانوني يعرّف بالجهة التي تقدّم خدمة {SITE_NAME}، كما هو مطلوب من الخدمات الإلكترونية
      في الاتحاد الأوروبي.
    </p>
  ),
  sections: [
    {
      id: 'provider',
      title: 'مقدّم الخدمة',
      body: (
        <>
          <address>
            <V>{c.operator.name}</V>
            <br />
            <V>{c.operator.legalForm}</V>
            <br />
            <V>{c.operator.street}</V>
            <br />
            <V>{c.operator.city}</V>
            <br />
            <V>{c.operator.country}</V>
          </address>
          <dl>
            <div>
              <dt>يمثّله</dt>
              <dd>
                <V>{c.operator.representative}</V>
              </dd>
            </div>
            <div>
              <dt>السجلّ التجاري</dt>
              <dd>
                <V>{c.operator.register}</V>
              </dd>
            </div>
            <div>
              <dt>الرقم الضريبي (ضريبة القيمة المضافة)</dt>
              <dd>
                <V>{c.operator.vatId}</V>
              </dd>
            </div>
          </dl>
        </>
      ),
    },
    {
      id: 'contact',
      title: 'التواصل',
      body: (
        <dl>
          <div>
            <dt>البريد الإلكتروني</dt>
            <dd>
              <Mail>{c.operator.email}</Mail>
            </dd>
          </div>
          <div>
            <dt>الهاتف</dt>
            <dd>
              <V>{c.operator.phone}</V>
            </dd>
          </div>
          <div>
            <dt>طلبات الخصوصية</dt>
            <dd>
              <Mail>{c.privacyEmail}</Mail>
            </dd>
          </div>
        </dl>
      ),
    },
    {
      id: 'responsible',
      title: 'المسؤول عن المحتوى',
      body: (
        <>
          <p>
            المسؤول عن المحتوى التحريري لهذا الموقع (وليس عن الإعلانات والرسائل والتقييمات التي
            يكتبها المستخدمون):
          </p>
          <address>
            <V>{c.operator.contentResponsible}</V>
          </address>
        </>
      ),
    },
    {
      id: 'dsa',
      title: 'نقاط الاتصال بموجب قانون الخدمات الرقمية',
      body: (
        <>
          <p>
            نقطة الاتصال الموحّدة لسلطات الدول الأعضاء في الاتحاد الأوروبي والمفوضية الأوروبية
            والمجلس الأوروبي للخدمات الرقمية (المادة 11 من اللائحة (EU) 2022/2065)، ولمستخدمي
            الخدمة (المادة 12):
          </p>
          <address>
            <Mail>{c.dsaContactEmail}</Mail>
          </address>
          <p>
            يمكنك مراسلتنا بالعربية أو الإنجليزية. يمكن الإبلاغ عن محتوى غير قانوني بزرّ «إبلاغ»
            الموجود في كل إعلان وكل ملف بائع، أو بالبريد الإلكتروني على العنوان أعلاه. طريقة
            معالجتنا للبلاغات موضّحة في <Ref to="rules#reports">قواعد المجتمع</Ref>.
          </p>
        </>
      ),
    },
    {
      id: 'disputes',
      title: 'تسوية نزاعات المستهلكين',
      body: (
        <p>
          لسنا ملزمين بالمشاركة في إجراءات تسوية النزاعات أمام هيئة تحكيم للمستهلكين ولا نشارك
          فيها. إذا كانت لديك شكوى فراسلنا أولًا، وسنحاول أن نجد حلًّا معك.
        </p>
      ),
    },
    {
      id: 'liability',
      title: 'محتوى المستخدمين والروابط',
      body: (
        <>
          <p>
            الإعلانات والصور والرسائل والتقييمات يكتبها المستخدمون وهم المسؤولون عنها. بصفتنا
            مزوّد استضافة لسنا ملزمين بمراقبة هذا المحتوى بشكل عام، ونحذف المحتوى غير القانوني
            فور علمنا به.
          </p>
          <p>
            إذا تضمّن هذا الموقع روابط إلى مواقع خارجية، فالمسؤولية عن محتواها تقع على مشغّليها
            وحدهم.
          </p>
        </>
      ),
    },
  ],
});

export default imprint;
