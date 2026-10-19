export function MeScreen({ onReset }: { onReset: () => void }) {
  return (
    <section className="panel block rise me">
      <div className="avatar" aria-hidden="true">
        CA
      </div>
      <h2>示例数据</h2>
      <p>
        金额、预算和近 7 天走势都是虚构的，用来演示语音记账。不会读取账户，也不会上传录音。
      </p>
      <button type="button" className="quiet-btn" onClick={onReset}>
        恢复示例数据
      </button>
    </section>
  );
}
